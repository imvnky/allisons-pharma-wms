import pytest
from datetime import date
from app.models.entities import Warehouse, User, Product, PhysicalCount, DailyReconciliationRecord
from app.api.v1.reconciliation import get_or_create_session
from tests.conftest import make_auth_headers


def test_role_count_type_enforcement(client, db_session):
    """
    Verifies strict floor counter role boundaries:
    - Carton Staff can ONLY submit CARTON counts.
    - Loose Staff can ONLY submit LOOSE counts.
    - Violations return HTTP 403 Forbidden.
    """
    mulemba = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    user_carton = db_session.query(User).filter_by(username="counter.carton").first()
    user_loose = db_session.query(User).filter_by(username="counter.loose").first()
    product = db_session.query(Product).first()

    headers_carton = make_auth_headers(user_carton.username, user_carton.role.code, user_carton.id, mulemba.id)
    headers_loose = make_auth_headers(user_loose.username, user_loose.role.code, user_loose.id, mulemba.id)

    # 1. Carton staff submits carton count -> Success
    res1 = client.post("/api/v1/counts/submit", json={
        "product_id": product.id, "count_type": "CARTON", "quantity": 10
    }, headers=headers_carton)
    assert res1.status_code == 200

    # 2. Carton staff attempts to submit loose count -> Forbidden (403)
    res2 = client.post("/api/v1/counts/submit", json={
        "product_id": product.id, "count_type": "LOOSE", "quantity": 5
    }, headers=headers_carton)
    assert res2.status_code == 403
    assert "loose staff or supervisor" in res2.json()["detail"].lower()

    # 3. Carton staff attempts to submit display count -> Forbidden (403)
    res3 = client.post("/api/v1/counts/submit", json={
        "product_id": product.id, "count_type": "DISPLAY", "quantity": 3
    }, headers=headers_carton)
    assert res3.status_code == 403
    assert "display staff or supervisor" in res3.json()["detail"].lower()

    # 4. Loose staff attempts to submit carton count -> Forbidden (403)
    res4 = client.post("/api/v1/counts/submit", json={
        "product_id": product.id, "count_type": "CARTON", "quantity": 20
    }, headers=headers_loose)
    assert res4.status_code == 403
    assert "carton staff or supervisor" in res4.json()["detail"].lower()


def test_submission_ownership_isolation(client, db_session):
    """
    Verifies that floor counters can only edit or delete their OWN submissions.
    Attempting to modify another staff member's count returns HTTP 403 Forbidden.
    """
    mulemba = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    user_carton = db_session.query(User).filter_by(username="counter.carton").first()
    user_loose = db_session.query(User).filter_by(username="counter.loose").first()
    product = db_session.query(Product).first()

    session = get_or_create_session(db_session, mulemba.id, date.today())

    # User Carton logs a submission
    count_entry = PhysicalCount(
        session_id=session.id,
        product_id=product.id,
        submitted_by=user_carton.id,
        count_type="CARTON",
        quantity=30
    )
    db_session.add(count_entry)
    db_session.commit()

    headers_loose = make_auth_headers(user_loose.username, user_loose.role.code, user_loose.id, mulemba.id)

    # User Loose tries to edit User Carton's count -> 403 Forbidden
    edit_resp = client.put(f"/api/v1/counts/{count_entry.id}", json={
        "product_id": product.id,
        "count_type": "CARTON",
        "quantity": 99
    }, headers=headers_loose)
    assert edit_resp.status_code == 403
    assert "another staff member" in edit_resp.json()["detail"].lower()

    # User Loose tries to delete User Carton's count -> 403 Forbidden
    del_resp = client.delete(f"/api/v1/counts/{count_entry.id}", headers=headers_loose)
    assert del_resp.status_code == 403
    assert "another staff member" in del_resp.json()["detail"].lower()


def test_warehouse_scoping_isolation(client, db_session):
    """
    Verifies that a supervisor from Warehouse A (Palanca) CANNOT modify
    reconciliation records or daily sales belonging to Warehouse B (Mulemba).
    """
    mulemba = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    palanca = db_session.query(Warehouse).filter_by(code="PALANCA").first()
    sup_palanca = db_session.query(User).filter_by(username="supervisor.palanca").first()
    product = db_session.query(Product).first()

    # Create Mulemba session & record
    mulemba_session = get_or_create_session(db_session, mulemba.id, date.today())
    mulemba_rec = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=mulemba_session.id, product_id=product.id
    ).first()

    # Palanca supervisor headers
    headers_palanca = make_auth_headers(sup_palanca.username, sup_palanca.role.code, sup_palanca.id, palanca.id)

    # Palanca supervisor attempts to update sales for Mulemba's record -> 403 Forbidden
    tamper_resp = client.put("/api/v1/reconciliation/sales", json={
        "record_id": mulemba_rec.id,
        "sales_qty": 500
    }, headers=headers_palanca)

    assert tamper_resp.status_code == 403
    assert "another warehouse" in tamper_resp.json()["detail"].lower()
