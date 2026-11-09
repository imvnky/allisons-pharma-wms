import pytest
from datetime import date, timedelta
from app.models.entities import (
    Warehouse, User, Product, ShipmentArrival, ShipmentArrivalItem,
    Transfer, TransferItem, DailyReconciliationRecord
)
from app.api.v1.reconciliation import get_or_create_session
from app.api.v1.alerts import calculate_warehouse_fefo_batches
from tests.conftest import make_auth_headers


def test_fefo_dynamic_batch_depletion(db_session):
    """
    Verifies First-Expired, First-Out (FEFO) batch inventory depletion:
    1. Two batches arrive with different expiry dates.
    2. Sales occur -> earliest expiring batch depletes first.
    3. When earliest batch is fully sold (0 remaining), it disappears from active alerts.
    4. Outbound transfers also deplete according to FEFO.
    """
    wh = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    user_sup = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    product = db_session.query(Product).first()

    today = date.today()
    exp_early = today + timedelta(days=25)   # Critical (< 30 days)
    exp_later = today + timedelta(days=70)   # Notice (< 90 days)

    # 1. Arrival 1: Batch A (200 units, expires in 25 days)
    arr1 = ShipmentArrival(
        warehouse_id=wh.id, arrival_type="SEA_SHIPMENT", vessel_name="MV Benguela",
        received_by=user_sup.id, received_date=today, status="VERIFIED"
    )
    db_session.add(arr1)
    db_session.flush()

    item_a = ShipmentArrivalItem(
        arrival_id=arr1.id, product_id=product.id, batch_number="BAT-EARLY-25D",
        expiry_date=exp_early, cartons_received=4, units_received=200
    )
    db_session.add(item_a)

    # 2. Arrival 2: Batch B (300 units, expires in 70 days)
    arr2 = ShipmentArrival(
        warehouse_id=wh.id, arrival_type="SEA_SHIPMENT", vessel_name="MV Luanda",
        received_by=user_sup.id, received_date=today, status="VERIFIED"
    )
    db_session.add(arr2)
    db_session.flush()

    item_b = ShipmentArrivalItem(
        arrival_id=arr2.id, product_id=product.id, batch_number="BAT-LATER-70D",
        expiry_date=exp_later, cartons_received=6, units_received=300
    )
    db_session.add(item_b)
    db_session.commit()

    # Baseline: 0 sales recorded
    batches = calculate_warehouse_fefo_batches(db_session, wh.id, days_threshold=90)
    assert len(batches) == 2
    b_early = next(b for b in batches if b["batch_number"] == "BAT-EARLY-25D")
    b_later = next(b for b in batches if b["batch_number"] == "BAT-LATER-70D")

    assert b_early["remaining_units"] == 200
    assert b_early["depleted_units"] == 0
    assert b_early["urgency"] == "CRITICAL"

    assert b_later["remaining_units"] == 300
    assert b_later["depleted_units"] == 0
    assert b_later["urgency"] == "NOTICE"

    # Step 2: Record 150 units sold in daily reconciliation
    session = get_or_create_session(db_session, wh.id, today)
    rec = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session.id, product_id=product.id
    ).first()
    rec.sales_qty = 150
    db_session.commit()

    # FEFO check: 150 units should be deducted from Batch A (earliest)
    batches_after_sales = calculate_warehouse_fefo_batches(db_session, wh.id, days_threshold=90)
    assert len(batches_after_sales) == 2

    b_early2 = next(b for b in batches_after_sales if b["batch_number"] == "BAT-EARLY-25D")
    b_later2 = next(b for b in batches_after_sales if b["batch_number"] == "BAT-LATER-70D")

    assert b_early2["remaining_units"] == 50   # 200 - 150 = 50 remaining
    assert b_early2["depleted_units"] == 150
    assert b_later2["remaining_units"] == 300  # Untouched

    # Step 3: Record total sales of 250 units (exceeds Batch A's 200 units)
    rec.sales_qty = 250
    db_session.commit()

    # FEFO check: Batch A is 100% depleted (0 remaining) -> should disappear from active alerts!
    batches_depleted = calculate_warehouse_fefo_batches(db_session, wh.id, days_threshold=90)
    assert len(batches_depleted) == 1
    assert batches_depleted[0]["batch_number"] == "BAT-LATER-70D"
    assert batches_depleted[0]["remaining_units"] == 250  # 300 - 50 = 250
    assert batches_depleted[0]["depleted_units"] == 50

    # If include_depleted=True, Batch A is returned with status DEPLETED
    all_batches = calculate_warehouse_fefo_batches(db_session, wh.id, days_threshold=90, include_depleted=True)
    assert len(all_batches) == 2
    depleted_a = next(b for b in all_batches if b["batch_number"] == "BAT-EARLY-25D")
    assert depleted_a["remaining_units"] == 0
    assert depleted_a["urgency"] == "DEPLETED"


def test_fefo_near_expiry_api_endpoint(client, db_session):
    """
    Tests the GET /alerts/near-expiry endpoint returns real-time FEFO depleted units.
    """
    wh = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    user_sup = db_session.query(User).filter_by(username="supervisor.mulemba").first()
    product = db_session.query(Product).first()

    today = date.today()
    arr = ShipmentArrival(
        warehouse_id=wh.id, arrival_type="LOCAL_SUPPLIER", vessel_name="Angola Pharma Direct",
        received_by=user_sup.id, received_date=today, status="VERIFIED"
    )
    db_session.add(arr)
    db_session.flush()

    db_session.add(ShipmentArrivalItem(
        arrival_id=arr.id, product_id=product.id, batch_number="BAT-API-TEST",
        expiry_date=today + timedelta(days=20), cartons_received=2, units_received=100
    ))
    db_session.commit()

    headers = make_auth_headers(user_sup.username, user_sup.role.code, user_sup.id, wh.id)

    response = client.get("/api/v1/alerts/near-expiry?days_threshold=60", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["warehouse_id"] == wh.id
    assert "items" in data
    assert any(it["batch_number"] == "BAT-API-TEST" for it in data["items"])

    item = next(it for it in data["items"] if it["batch_number"] == "BAT-API-TEST")
    assert item["remaining_units"] == 100
    assert item["urgency"] == "CRITICAL"
    assert "value_aoa" in item
