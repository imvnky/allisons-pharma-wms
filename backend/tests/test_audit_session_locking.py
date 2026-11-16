import pytest
from datetime import date
from app.models.entities import InventorySession, User, Product, PhysicalCount, DailyReconciliationRecord
from app.api.v1.reconciliation import get_or_create_session, sync_session_calculations
from tests.conftest import make_auth_headers


def test_session_lifecycle_and_immutability_locking(client, db_session):
    """
    Comprehensive test of the Audit Immutability Guard:
    1. During UNDER_PROCESS: counts, sales, and remarks can be submitted/edited.
    2. Finalize session: transitions to INVENTORY_DONE.
    3. Once INVENTORY_DONE: all write/edit operations return HTTP 400 Bad Request.
    """
    user_sup = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    user_carton = db_session.query(User).filter_by(username="counter.carton").first()
    product = db_session.query(Product).first()

    sup_headers = make_auth_headers(user_sup.username, user_sup.role.code, user_sup.id, user_sup.warehouse_id)
    carton_headers = make_auth_headers(user_carton.username, user_carton.role.code, user_carton.id, user_carton.warehouse_id)

    today = date.today()
    session = get_or_create_session(db_session, user_sup.warehouse_id, today)
    assert session.status == "UNDER_PROCESS"

    # Step 1: In open session, carton counter submits count
    count_resp = client.post("/api/v1/counts/submit", json={
        "product_id": product.id,
        "count_type": "CARTON",
        "quantity": 10
    }, headers=carton_headers)
    assert count_resp.status_code == 200
    count_id = count_resp.json()["count_id"]

    # Step 2: In open session, supervisor updates sales
    rec = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session.id, product_id=product.id
    ).first()

    sales_resp = client.put("/api/v1/reconciliation/sales", json={
        "record_id": rec.id,
        "sales_qty": 25
    }, headers=sup_headers)
    assert sales_resp.status_code == 200
    assert sales_resp.json()["sales_qty"] == 25

    # Step 3: In open session, supervisor updates remarks
    remarks_resp = client.put("/api/v1/reconciliation/remarks", json={
        "record_id": rec.id,
        "remarks": "Preliminary counts verified by floor supervisor"
    }, headers=sup_headers)
    assert remarks_resp.status_code == 200

    # Step 4: Finalize the daily inventory session
    fin_resp = client.post(f"/api/v1/reconciliation/finalize?session_id={session.id}", headers=sup_headers)
    assert fin_resp.status_code == 200

    db_session.refresh(session)
    assert session.status == "INVENTORY_DONE"
    assert session.finalized_at is not None

    # Step 5: Verify all mutations are strictly rejected on finalized session (HTTP 400)

    # A) Attempt to submit new count
    blocked_count = client.post("/api/v1/counts/submit", json={
        "product_id": product.id,
        "count_type": "CARTON",
        "quantity": 5
    }, headers=carton_headers)
    assert blocked_count.status_code == 400
    assert "finalized" in blocked_count.json()["detail"].lower()

    # B) Attempt to update existing count
    blocked_edit_count = client.put(f"/api/v1/counts/{count_id}", json={
        "product_id": product.id,
        "count_type": "CARTON",
        "quantity": 12
    }, headers=carton_headers)
    assert blocked_edit_count.status_code == 400

    # C) Attempt to delete existing count
    blocked_del_count = client.delete(f"/api/v1/counts/{count_id}", headers=carton_headers)
    assert blocked_del_count.status_code == 400

    # D) Attempt to alter sales
    blocked_sales = client.put("/api/v1/reconciliation/sales", json={
        "record_id": rec.id,
        "sales_qty": 999
    }, headers=sup_headers)
    assert blocked_sales.status_code == 400
    assert "locked" in blocked_sales.json()["detail"].lower()

    # E) Attempt to alter remarks
    blocked_remarks = client.put("/api/v1/reconciliation/remarks", json={
        "record_id": rec.id,
        "remarks": "Attempting unauthorized post-audit change"
    }, headers=sup_headers)
    assert blocked_remarks.status_code == 400
    assert "locked" in blocked_remarks.json()["detail"].lower()

    # F) Attempt to re-finalize an already finalized session
    blocked_refin = client.post(f"/api/v1/reconciliation/finalize?session_id={session.id}", headers=sup_headers)
    assert blocked_refin.status_code == 400
    assert "already finalized" in blocked_refin.json()["detail"].lower()


def test_sync_session_calculations_frozen_on_finalized_session(db_session):
    """
    Verifies that calling sync_session_calculations on an INVENTORY_DONE session
    is an immediate no-op, preserving audit figures exactly as locked.
    """
    user_sup = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    product = db_session.query(Product).first()

    today = date(2026, 11, 20)
    session = get_or_create_session(db_session, user_sup.warehouse_id, today)
    session.status = "INVENTORY_DONE"
    db_session.commit()

    rec = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session.id, product_id=product.id
    ).first()
    rec.carton_count = 50
    rec.physical_stock = 50 * product.units_per_carton
    db_session.commit()

    # Add a phantom count in the background
    db_session.add(PhysicalCount(
        session_id=session.id, product_id=product.id, submitted_by=user_sup.id,
        count_type="CARTON", quantity=999
    ))
    db_session.commit()

    # Run sync - should exit early without touching carton_count
    sync_session_calculations(db_session, session)

    db_session.refresh(rec)
    assert rec.carton_count == 50, "Finalized session was erroneously mutated by sync_session_calculations"

