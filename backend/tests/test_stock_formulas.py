import pytest
from datetime import date, timedelta
from app.models.entities import (
    DailyReconciliationRecord, Product, Warehouse, InventorySession,
    PhysicalCount, ShipmentArrival, ShipmentArrivalItem, Transfer, TransferItem, User
)
from app.api.v1.reconciliation import (
    recalculate_record, sync_session_calculations, get_or_create_session
)


def test_recalculate_record_formula():
    """
    Verifies the foundational stock formulas:
    Required Stock = Opening + Arrivals - Transfers - Sales
    Physical Stock = (Cartons * UnitsPerCarton) + Loose + Display
    Difference = Physical Stock - Required Stock
    """
    product = Product(
        id=1,
        sku="TEST-SKU-01",
        name="Test Antibiotic 500mg",
        units_per_carton=50,
        unit_price=1000.0
    )

    record = DailyReconciliationRecord(
        opening_stock=1000,
        arrivals_qty=200,
        transfers_qty=50,
        sales_qty=150,
        carton_count=18,      # 18 * 50 = 900
        loose_count=45,       # 45
        display_count=5       # 5  --> Total Physical = 950
    )

    recalculate_record(record, product)

    # 1000 (opening) + 200 (arrivals) - 50 (transfers) - 150 (sales) = 1000
    assert record.required_stock == 1000, f"Expected 1000, got {record.required_stock}"

    # (18 * 50) + 45 + 5 = 950
    assert record.physical_stock == 950, f"Expected 950, got {record.physical_stock}"

    # 950 - 1000 = -50 (Shortage of 50 units)
    assert record.difference == -50, f"Expected -50, got {record.difference}"


def test_recalculate_record_balanced_and_surplus():
    """Tests zero variance (balanced) and positive variance (surplus)."""
    product = Product(id=2, sku="TEST-SKU-02", name="Syrup 100ml", units_per_carton=20, unit_price=500.0)

    # Balanced case
    rec_balanced = DailyReconciliationRecord(
        opening_stock=500, arrivals_qty=0, transfers_qty=0, sales_qty=100,
        carton_count=20, loose_count=0, display_count=0 # 400 physical vs 400 required
    )
    recalculate_record(rec_balanced, product)
    assert rec_balanced.required_stock == 400
    assert rec_balanced.physical_stock == 400
    assert rec_balanced.difference == 0

    # Surplus case
    rec_surplus = DailyReconciliationRecord(
        opening_stock=500, arrivals_qty=100, transfers_qty=0, sales_qty=100,
        carton_count=26, loose_count=10, display_count=5 # 535 physical vs 500 required
    )
    recalculate_record(rec_surplus, product)
    assert rec_surplus.required_stock == 500
    assert rec_surplus.physical_stock == 535
    assert rec_surplus.difference == 35


def test_sync_session_calculations_with_counts_and_logistics(db_session):
    """
    Integration test: verifies sync_session_calculations correctly sums:
    - Multiple carton counts submitted by different staff
    - Loose unit counts
    - Latest display count
    - Verified shipment arrivals
    - Outward transfers
    """
    wh = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    product = db_session.query(Product).first()
    user = db_session.query(User).filter_by(username="supervisor.mulemba").first()

    today = date(2026, 11, 10)
    session = get_or_create_session(db_session, wh.id, today)

    # 1. Staff submits counts
    # Staff 1 submits 10 cartons
    db_session.add(PhysicalCount(
        session_id=session.id, product_id=product.id, submitted_by=user.id,
        count_type="CARTON", quantity=10
    ))
    # Staff 2 submits 5 cartons
    db_session.add(PhysicalCount(
        session_id=session.id, product_id=product.id, submitted_by=user.id,
        count_type="CARTON", quantity=5
    ))
    # Staff submits 14 loose units
    db_session.add(PhysicalCount(
        session_id=session.id, product_id=product.id, submitted_by=user.id,
        count_type="LOOSE", quantity=14
    ))
    # Display verified at 6 units
    db_session.add(PhysicalCount(
        session_id=session.id, product_id=product.id, submitted_by=user.id,
        count_type="DISPLAY", quantity=6
    ))
    db_session.commit()

    # 2. Record inward verified shipment arrival: 5 cartons
    arrival = ShipmentArrival(
        warehouse_id=wh.id, arrival_type="SEA_SHIPMENT", vessel_name="MV Luanda",
        received_by=user.id, received_date=today, status="VERIFIED"
    )
    db_session.add(arrival)
    db_session.flush()

    arr_item = ShipmentArrivalItem(
        arrival_id=arrival.id, product_id=product.id, batch_number="BAT-ARR-1",
        expiry_date=date(2028, 6, 30), cartons_received=5, units_received=5 * product.units_per_carton
    )
    db_session.add(arr_item)
    db_session.commit()

    # 3. Execute sync
    sync_session_calculations(db_session, session)

    record = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session.id, product_id=product.id
    ).first()

    assert record.carton_count == 15 # 10 + 5
    assert record.loose_count == 14
    assert record.display_count == 6
    assert record.arrivals_qty == 5 * product.units_per_carton

    expected_physical = (15 * product.units_per_carton) + 14 + 6
    assert record.physical_stock == expected_physical


def test_display_and_stock_continuity_from_previous_day(db_session):
    """
    Tests day-to-day continuity:
    Day 2 opening stock must equal Day 1 finalized closing stock.
    Day 2 opening display must equal Day 1 finalized closing display count.
    """
    wh = db_session.query(Warehouse).filter_by(code="MULEMBA").first()
    product = db_session.query(Product).first()
    user = db_session.query(User).filter_by(username="supervisor.mulemba").first()

    day1 = date(2026, 11, 1)
    day2 = date(2026, 11, 2)

    # Create Day 1 session and establish closing counts
    session_day1 = get_or_create_session(db_session, wh.id, day1)
    rec1 = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session_day1.id, product_id=product.id
    ).first()

    rec1.carton_count = 20
    rec1.loose_count = 8
    rec1.display_count = 12
    rec1.physical_stock = (20 * product.units_per_carton) + 8 + 12
    rec1.required_stock = rec1.physical_stock
    rec1.difference = 0
    session_day1.status = "INVENTORY_DONE"
    session_day1.finalized_by = user.id
    db_session.commit()

    # Create Day 2 session
    session_day2 = get_or_create_session(db_session, wh.id, day2)
    rec2 = db_session.query(DailyReconciliationRecord).filter_by(
        session_id=session_day2.id, product_id=product.id
    ).first()

    # Day 2 Opening stock must equal Day 1 closing physical stock
    assert rec2.opening_stock == rec1.physical_stock, (
        f"Day 2 opening stock ({rec2.opening_stock}) did not match Day 1 closing stock ({rec1.physical_stock})"
    )

    # Day 2 Opening display count must equal Day 1 closing display count
    assert rec2.display_count == 12, (
        f"Day 2 opening display ({rec2.display_count}) did not match Day 1 closing display (12)"
    )

