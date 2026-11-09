import pytest
from datetime import date
from app.models.entities import Warehouse, User, Product, Transfer, TransferItem
from app.api.v1.reconciliation import get_or_create_session, sync_session_calculations
from tests.conftest import make_auth_headers


def test_transfer_dispatch_and_self_transfer_prevention(client, db_session):
    """
    Tests inter-warehouse transfer creation:
    - Normal dispatch: Mulemba -> Palanca (HTTP 200, status=IN_TRANSIT).
    - Self-transfer attempt: Mulemba -> Mulemba (HTTP 400).
    """
    mulemba = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    palanca = db_session.query(Warehouse).filter_by(code="PALANCA").first()
    user_sup = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    product = db_session.query(Product).first()

    headers = make_auth_headers(user_sup.username, user_sup.role.code, user_sup.id, mulemba.id)

    # 1. Attempt self-transfer (should fail with 400)
    self_trf_resp = client.post("/api/v1/shipments/transfers", json={
        "to_warehouse_id": mulemba.id,
        "driver_name": "Joao Carrier",
        "vehicle_plate": "LD-88-22-AA",
        "items": [{"product_id": product.id, "dispatched_qty": 50}],
        "notes": "Testing invalid self-transfer"
    }, headers=headers)
    assert self_trf_resp.status_code == 400
    assert "cannot be the same" in self_trf_resp.json()["detail"].lower()

    # 2. Valid dispatch: Mulemba -> Palanca
    valid_trf_resp = client.post("/api/v1/shipments/transfers", json={
        "to_warehouse_id": palanca.id,
        "driver_name": "Joao Carrier",
        "vehicle_plate": "LD-88-22-AA",
        "items": [{"product_id": product.id, "dispatched_qty": 50}],
        "notes": "Emergency antibiotic replenishment"
    }, headers=headers)
    assert valid_trf_resp.status_code == 200

    transfer = db_session.query(Transfer).order_by(Transfer.id.desc()).first()
    assert transfer.from_warehouse_id == mulemba.id
    assert transfer.to_warehouse_id == palanca.id
    assert transfer.status == "IN_TRANSIT"
    assert transfer.items[0].dispatched_qty == 50


def test_transfer_receiving_approval_and_authorization(client, db_session):
    """
    Tests transfer approval workflow:
    - Origin supervisor cannot approve outgoing transfer (HTTP 403).
    - Destination supervisor can approve (HTTP 200, status=APPROVED).
    - Re-approval is blocked (HTTP 400).
    """
    mulemba = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    palanca = db_session.query(Warehouse).filter_by(code="PALANCA").first()
    sup_mulemba = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    sup_palanca = db_session.query(User).filter_by(username="supervisor.palanca").first()
    product = db_session.query(Product).first()

    headers_mulemba = make_auth_headers(sup_mulemba.username, sup_mulemba.role.code, sup_mulemba.id, mulemba.id)
    headers_palanca = make_auth_headers(sup_palanca.username, sup_palanca.role.code, sup_palanca.id, palanca.id)

    # Create transfer in transit from Mulemba to Palanca
    transfer = Transfer(
        transfer_number="TR-TEST-999",
        from_warehouse_id=mulemba.id,
        to_warehouse_id=palanca.id,
        dispatched_by=sup_mulemba.id,
        driver_name="Manuel Cargo",
        vehicle_plate="LD-12-34-XX",
        status="IN_TRANSIT"
    )
    db_session.add(transfer)
    db_session.flush()

    item = TransferItem(transfer_id=transfer.id, product_id=product.id, dispatched_qty=100)
    db_session.add(item)
    db_session.commit()

    # 1. Dispatching warehouse supervisor tries to approve (should be 403 Forbidden)
    unauth_resp = client.post(f"/api/v1/shipments/transfers/{transfer.id}/approve", headers=headers_mulemba)
    assert unauth_resp.status_code == 403
    assert "receiving warehouse" in unauth_resp.json()["detail"].lower()

    # 2. Receiving warehouse supervisor approves (should succeed)
    auth_resp = client.post(f"/api/v1/shipments/transfers/{transfer.id}/approve", headers=headers_palanca)
    assert auth_resp.status_code == 200

    db_session.refresh(transfer)
    assert transfer.status == "APPROVED"
    assert transfer.approved_by == sup_palanca.id
    assert transfer.approved_at is not None
    assert transfer.items[0].received_qty == 100

    # 3. Attempting to approve again (should be 400 Bad Request)
    reapprove_resp = client.post(f"/api/v1/shipments/transfers/{transfer.id}/approve", headers=headers_palanca)
    assert reapprove_resp.status_code == 400
    assert "already been approved" in reapprove_resp.json()["detail"].lower()
