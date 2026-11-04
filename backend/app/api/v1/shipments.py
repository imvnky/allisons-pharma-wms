from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import (
    User, ShipmentArrival, ShipmentArrivalItem, Transfer, TransferItem, Warehouse, Product
)
from app.schemas.dto import ShipmentArrivalCreate, TransferCreate

router = APIRouter(prefix="/shipments", tags=["Shipments & Transfers"])

# ----------------- ARRIVALS -----------------
@router.get("/arrivals")
def list_arrivals(
    current_user: User = Depends(require_permission("SHIPMENTS_ARRIVALS", "VIEW")),
    db: Session = Depends(get_db)
):
    query = db.query(ShipmentArrival)
    if current_user.role.code not in ["SUPER_ADMIN", "HQ_ADMIN"]:
        query = query.filter(ShipmentArrival.warehouse_id == current_user.warehouse_id)
    arrivals = query.order_by(ShipmentArrival.created_at.desc()).all()

    result = []
    for a in arrivals:
        items_count = len(a.items)
        total_units = sum(i.units_received for i in a.items)
        result.append({
            "id": a.id,
            "arrival_number": f"ARR-2026-{a.id:03d}",
            "warehouse_name": a.warehouse.name,
            "arrival_type": a.arrival_type,
            "vessel_name": a.vessel_name or "Local Supplier",
            "tracking_bl_number": a.tracking_bl_number or "N/A",
            "container_number": a.container_number or "N/A",
            "supplier_name": a.supplier_name or "N/A",
            "received_date": str(a.received_date),
            "status": a.status,
            "items_count": items_count,
            "total_units": total_units,
            "items": [
                {
                    "product_name": i.product.name,
                    "sku": i.product.sku,
                    "batch_number": i.batch_number,
                    "expiry_date": str(i.expiry_date),
                    "cartons": i.cartons_received,
                    "units": i.units_received
                }
                for i in a.items
            ]
        })
    return result

@router.post("/arrivals")
def create_arrival(
    payload: ShipmentArrivalCreate,
    current_user: User = Depends(require_permission("SHIPMENTS_ARRIVALS", "SUBMIT")),
    db: Session = Depends(get_db)
):
    wh_id = current_user.warehouse_id
    if not wh_id:
        raise HTTPException(status_code=400, detail="User must belong to a warehouse to record arrivals")

    arrival = ShipmentArrival(
        warehouse_id=wh_id,
        arrival_type=payload.arrival_type,
        vessel_name=payload.vessel_name,
        tracking_bl_number=payload.tracking_bl_number,
        container_number=payload.container_number,
        supplier_name=payload.supplier_name,
        received_by=current_user.id,
        received_date=payload.received_date,
        status="VERIFIED"
    )
    db.add(arrival)
    db.flush()

    for it in payload.items:
        prod = db.query(Product).filter(Product.id == it["product_id"]).first()
        if prod:
            cartons = it.get("cartons_received", 0)
            units = it.get("units_received", 0) or (cartons * prod.units_per_carton)
            item = ShipmentArrivalItem(
                arrival_id=arrival.id,
                product_id=prod.id,
                batch_number=it.get("batch_number", "BAT-GEN-01"),
                expiry_date=it.get("expiry_date", date(2028, 12, 31)),
                cartons_received=cartons,
                units_received=units
            )
            db.add(item)

    db.commit()
    return {"status": "success", "arrival_id": arrival.id, "message": "Shipment arrival logged into stock!"}

# ----------------- TRANSFERS -----------------
@router.get("/transfers")
def list_transfers(
    current_user: User = Depends(require_permission("TRANSFERS", "VIEW")),
    db: Session = Depends(get_db)
):
    query = db.query(Transfer)
    if current_user.role.code not in ["SUPER_ADMIN", "HQ_ADMIN"]:
        query = query.filter(
            (Transfer.from_warehouse_id == current_user.warehouse_id) |
            (Transfer.to_warehouse_id == current_user.warehouse_id)
        )
    transfers = query.order_by(Transfer.dispatched_at.desc()).all()

    result = []
    for t in transfers:
        total_qty = sum(i.dispatched_qty for i in t.items)
        result.append({
            "id": t.id,
            "transfer_number": t.transfer_number,
            "from_warehouse_id": t.from_warehouse_id,
            "from_warehouse_name": t.from_warehouse.name,
            "to_warehouse_id": t.to_warehouse_id,
            "to_warehouse_name": t.to_warehouse.name,
            "driver_name": t.driver_name,
            "vehicle_plate": t.vehicle_plate,
            "status": t.status,
            "dispatched_at": str(t.dispatched_at),
            "approved_at": str(t.approved_at) if t.approved_at else None,
            "total_units": total_qty,
            "is_incoming": t.to_warehouse_id == current_user.warehouse_id,
            "items": [
                {
                    "sku": i.product.sku,
                    "product_name": i.product.name,
                    "batch_number": i.batch_number,
                    "dispatched_qty": i.dispatched_qty,
                    "received_qty": i.received_qty
                }
                for i in t.items
            ]
        })
    return result

@router.post("/transfers")
def create_transfer(
    payload: TransferCreate,
    current_user: User = Depends(require_permission("TRANSFERS", "SUBMIT")),
    db: Session = Depends(get_db)
):
    wh_id = current_user.warehouse_id
    if not wh_id:
        raise HTTPException(status_code=400, detail="User must belong to a warehouse to dispatch transfers")
    if wh_id == payload.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouse cannot be the same")

    count = db.query(Transfer).count()
    trf_num = f"TR-2026-{count + 101:03d}"

    transfer = Transfer(
        transfer_number=trf_num,
        from_warehouse_id=wh_id,
        to_warehouse_id=payload.to_warehouse_id,
        dispatched_by=current_user.id,
        driver_name=payload.driver_name,
        vehicle_plate=payload.vehicle_plate,
        notes=payload.notes,
        status="IN_TRANSIT"
    )
    db.add(transfer)
    db.flush()

    for it in payload.items:
        prod = db.query(Product).filter(Product.id == it["product_id"]).first()
        if prod:
            db.add(TransferItem(
                transfer_id=transfer.id,
                product_id=prod.id,
                batch_number=it.get("batch_number", "BAT-DEFAULT"),
                dispatched_qty=it["dispatched_qty"],
                received_qty=None
            ))

    db.commit()
    return {"status": "success", "transfer_number": trf_num, "message": "Transfer dispatched successfully!"}

@router.post("/transfers/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    current_user: User = Depends(require_permission("TRANSFERS", "APPROVE")),
    db: Session = Depends(get_db)
):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    # Only receiver or super admin can approve
    if current_user.role.code not in ["SUPER_ADMIN", "HQ_ADMIN"]:
        if transfer.to_warehouse_id != current_user.warehouse_id:
            raise HTTPException(status_code=403, detail="Only the receiving warehouse supervisor can approve this transfer")

    if transfer.status == "APPROVED":
        raise HTTPException(status_code=400, detail="Transfer has already been approved")

    transfer.status = "APPROVED"
    transfer.approved_by = current_user.id
    transfer.approved_at = func.now()

    # Match received qty with dispatched qty
    for item in transfer.items:
        item.received_qty = item.dispatched_qty

    db.commit()
    return {"status": "success", "message": f"Transfer {transfer.transfer_number} approved and added to your stock!"}

