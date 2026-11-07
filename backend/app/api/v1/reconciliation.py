from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import (
    User, InventorySession, DailyReconciliationRecord, Product,
    PhysicalCount, ShipmentArrival, ShipmentArrivalItem, Transfer, TransferItem, Warehouse
)
from app.schemas.dto import SalesUpdateRequest, RemarksUpdateRequest

router = APIRouter(prefix="/reconciliation", tags=["Daily Reconciliation"])

def get_or_create_session(db: Session, warehouse_id: int, target_date: date) -> InventorySession:
    session = db.query(InventorySession).filter(
        InventorySession.warehouse_id == warehouse_id,
        InventorySession.audit_date == target_date
    ).first()

    if not session:
        session = InventorySession(
            warehouse_id=warehouse_id,
            audit_date=target_date,
            status="UNDER_PROCESS"
        )
        db.add(session)
        db.flush()

        # Seed all active products into this session
        products = db.query(Product).filter(Product.is_active == True).all()
        
        # Check previous day closing stock for continuity
        prev_session = db.query(InventorySession).filter(
            InventorySession.warehouse_id == warehouse_id,
            InventorySession.audit_date < target_date
        ).order_by(InventorySession.audit_date.desc()).first()

        for p in products:
            prev_record = None
            if prev_session:
                prev_record = db.query(DailyReconciliationRecord).filter(
                    DailyReconciliationRecord.session_id == prev_session.id,
                    DailyReconciliationRecord.product_id == p.id
                ).first()

            opening = prev_record.physical_stock if prev_record else (100 * p.units_per_carton) # default initial
            display_open = prev_record.display_count if prev_record else 5

            record = DailyReconciliationRecord(
                session_id=session.id,
                product_id=p.id,
                opening_stock=opening,
                arrivals_qty=0,
                transfers_qty=0,
                sales_qty=0,
                carton_count=0,
                loose_count=0,
                display_count=display_open,
                required_stock=opening,
                physical_stock=display_open,
                difference=display_open - opening,
                remarks=""
            )
            db.add(record)
        db.commit()

    return session

def recalculate_record(record: DailyReconciliationRecord, product: Product):
    record.required_stock = record.opening_stock + record.arrivals_qty - record.transfers_qty - record.sales_qty
    record.physical_stock = (record.carton_count * product.units_per_carton) + record.loose_count + record.display_count
    record.difference = record.physical_stock - record.required_stock

def sync_session_calculations(db: Session, session: InventorySession):
    """Safely updates record columns from active counts, arrivals, and transfers."""
    if session.status == "INVENTORY_DONE":
        # Finalized records are immutable and must not be overwritten
        return

    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id
    ).all()

    wh_id = session.warehouse_id
    target_date = session.audit_date

    for r in records:
        # 1. Carton counts
        carton_sum = db.query(func.sum(PhysicalCount.quantity)).filter(
            PhysicalCount.session_id == session.id,
            PhysicalCount.product_id == r.product_id,
            PhysicalCount.count_type == "CARTON"
        ).scalar() or 0
        r.carton_count = carton_sum

        # 2. Loose counts
        loose_sum = db.query(func.sum(PhysicalCount.quantity)).filter(
            PhysicalCount.session_id == session.id,
            PhysicalCount.product_id == r.product_id,
            PhysicalCount.count_type == "LOOSE"
        ).scalar() or 0
        r.loose_count = loose_sum

        # 3. Display count (latest verified count for today)
        display_entry = db.query(PhysicalCount).filter(
            PhysicalCount.session_id == session.id,
            PhysicalCount.product_id == r.product_id,
            PhysicalCount.count_type == "DISPLAY"
        ).order_by(PhysicalCount.created_at.desc()).first()
        if display_entry:
            r.display_count = display_entry.quantity

        # 4. Inward Arrivals (Verified Sea + Local Deliveries)
        arr_sum = db.query(func.sum(ShipmentArrivalItem.units_received)).join(ShipmentArrival).filter(
            ShipmentArrival.warehouse_id == wh_id,
            ShipmentArrival.received_date == target_date,
            ShipmentArrivalItem.product_id == r.product_id,
            ShipmentArrival.status == "VERIFIED"
        ).scalar() or 0

        # Inward inter-warehouse transfers approved
        inward_trf = db.query(func.sum(TransferItem.received_qty)).join(Transfer).filter(
            Transfer.to_warehouse_id == wh_id,
            func.date(Transfer.approved_at) == target_date,
            TransferItem.product_id == r.product_id,
            Transfer.status == "APPROVED"
        ).scalar() or 0
        r.arrivals_qty = arr_sum + inward_trf

        # 5. Outward transfers dispatched today
        outward_trf = db.query(func.sum(TransferItem.dispatched_qty)).join(Transfer).filter(
            Transfer.from_warehouse_id == wh_id,
            func.date(Transfer.dispatched_at) == target_date,
            TransferItem.product_id == r.product_id
        ).scalar() or 0
        r.transfers_qty = outward_trf

        # Recalculate financial and physical difference
        recalculate_record(r, r.product)

    db.commit()

@router.get("/sheet")
def get_daily_sheet(
    target_date: date = date.today(),
    warehouse_id: int = None,
    current_user: User = Depends(require_permission("RECONCILIATION", "VIEW")),
    db: Session = Depends(get_db)
):
    # Determine warehouse
    wh_id = warehouse_id if (current_user.role.code in ["SUPER_ADMIN", "HQ_ADMIN"] and warehouse_id) else current_user.warehouse_id
    if not wh_id:
        # Default to Mulemba if HQ user didn't specify
        first_wh = db.query(Warehouse).first()
        wh_id = first_wh.id

    session = get_or_create_session(db, wh_id, target_date)
    
    # Sync calculations if session is still open
    if session.status != "INVENTORY_DONE":
        sync_session_calculations(db, session)

    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id
    ).all()

    # Format result for the 13 columns
    result = []
    for r in records:
        result.append({
            "record_id": r.id,
            "product_id": r.product.id,
            "sku": r.product.sku,
            "product_name": r.product.name,
            "category": r.product.category,
            "units_per_carton": r.product.units_per_carton,
            "unit_price": float(r.product.unit_price or 0),
            "opening_stock": r.opening_stock,
            "arrivals_qty": r.arrivals_qty,
            "transfers_qty": r.transfers_qty,
            "sales_qty": r.sales_qty,
            "carton_count": r.carton_count,
            "loose_count": r.loose_count,
            "display_count": r.display_count,
            "required_stock": r.required_stock,
            "physical_stock": r.physical_stock,
            "difference": r.difference,
            "remarks": r.remarks or ""
        })

    return {
        "session": {
            "id": session.id,
            "warehouse_id": session.warehouse_id,
            "warehouse_name": session.warehouse.name,
            "audit_date": str(session.audit_date),
            "status": session.status,
            "finalized_at": session.finalized_at
        },
        "records": result
    }

@router.put("/sales")
def update_sales(
    payload: SalesUpdateRequest,
    current_user: User = Depends(require_permission("RECONCILIATION", "EDIT_OWN")),
    db: Session = Depends(get_db)
):
    record = db.query(DailyReconciliationRecord).filter(DailyReconciliationRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Reconciliation record not found")
    
    # Audit Session Immutability Guard
    if record.session.status == "INVENTORY_DONE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update sales: Today's inventory session has already been finalized and locked."
        )

    # Check warehouse scoping
    if current_user.role.code not in ["SUPER_ADMIN", "HQ_ADMIN"]:
        if record.session.warehouse_id != current_user.warehouse_id:
            raise HTTPException(status_code=403, detail="Cannot edit records of another warehouse")

    record.sales_qty = max(0, payload.sales_qty)
    recalculate_record(record, record.product)
    db.commit()

    return {
        "record_id": record.id,
        "sales_qty": record.sales_qty,
        "required_stock": record.required_stock,
        "physical_stock": record.physical_stock,
        "difference": record.difference
    }

@router.put("/remarks")
def update_remarks(
    payload: RemarksUpdateRequest,
    current_user: User = Depends(require_permission("RECONCILIATION", "EDIT_OWN")),
    db: Session = Depends(get_db)
):
    record = db.query(DailyReconciliationRecord).filter(DailyReconciliationRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Reconciliation record not found")

    # Audit Session Immutability Guard
    if record.session.status == "INVENTORY_DONE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update remarks: Today's inventory session has already been finalized and locked."
        )

    record.remarks = payload.remarks
    db.commit()
    return {"status": "success", "record_id": record.id, "remarks": record.remarks}

@router.post("/finalize")
def finalize_daily_inventory(
    session_id: int,
    current_user: User = Depends(require_permission("RECONCILIATION", "APPROVE")),
    db: Session = Depends(get_db)
):
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == "INVENTORY_DONE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This daily inventory session is already finalized and submitted to HQ."
        )

    # Sync all calculations one final time before locking
    sync_session_calculations(db, session)

    session.status = "INVENTORY_DONE"
    session.finalized_by = current_user.id
    session.finalized_at = func.now()
    db.commit()

    return {"status": "success", "message": f"Daily inventory for {session.warehouse.name} finalized successfully!"}

