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
        total_cartons = sum(i.cartons_received for i in a.items)
        total_shortage = sum(getattr(i, 'shortage_units', 0) or 0 for i in a.items)
        display_num = getattr(a, 'shipment_number', None) or f"{a.id:02d}/26"

        result.append({
            "id": a.id,
            "arrival_number": f"ARR-2026-{a.id:03d}",
            "shipment_number": display_num, # e.g. "01/26", "02/26"
            "invoice_number": getattr(a, 'invoice_number', None) or "INV-N/A",
            "lot_size": getattr(a, 'lot_size', None) or "N/A",
            "freight_type": getattr(a, 'freight_type', None) or "CONTAINER",
            "warehouse_name": a.warehouse.name,
            "arrival_type": a.arrival_type,
            "vessel_name": a.vessel_name or "Cargo Freight",
            "tracking_bl_number": a.tracking_bl_number or "N/A",
            "container_number": a.container_number or "N/A",
            "supplier_name": a.supplier_name or "N/A",
            "received_date": str(a.received_date),
            "status": a.status,
            "items_count": items_count,
            "total_cartons": total_cartons,
            "total_units": total_units,
            "total_shortage_units": total_shortage,
            "items": [
                {
                    "product_id": i.product_id,
                    "product_name": i.product.name,
                    "sku": i.product.sku,
                    "packaging": i.product.units_per_carton,
                    "batch_number": i.batch_number,
                    "expiry_date": str(i.expiry_date),
                    "total_cartons": getattr(i, 'total_cartons', i.cartons_received) or i.cartons_received,
                    "total_units": getattr(i, 'total_units', i.units_received) or i.units_received,
                    "cartons_received": i.cartons_received,
                    "units_received": i.units_received,
                    "shortage_units": getattr(i, 'shortage_units', 0) or 0,
                    "remarks": getattr(i, 'remarks', '') or ''
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

    count = db.query(ShipmentArrival).count()
    shipment_num = payload.shipment_number or f"{count + 1:02d}/26"

    arrival = ShipmentArrival(
        warehouse_id=wh_id,
        shipment_number=shipment_num,
        invoice_number=payload.invoice_number,
        lot_size=payload.lot_size,
        freight_type=payload.freight_type or "CONTAINER",
        arrival_type=payload.arrival_type or ("SEA_SHIPMENT" if payload.freight_type == "CONTAINER" else "AIR_FREIGHT"),
        vessel_name=payload.vessel_name or payload.supplier_name or "Cargo Freight",
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
            units_per_carton = int(it.get("packaging") or prod.units_per_carton or 1)
            total_cartons = int(it.get("total_cartons", 0) or 0)
            cartons_received = int(it.get("cartons_received", 0) or 0)
            total_units = int(it.get("total_units", 0) or (total_cartons * units_per_carton))
            units_received = int(it.get("units_received", 0) or (cartons_received * units_per_carton))
            shortage_units = int(it.get("shortage_units", max(0, total_units - units_received)) or 0)

            item = ShipmentArrivalItem(
                arrival_id=arrival.id,
                product_id=prod.id,
                batch_number=it.get("batch_number", "BAT-GEN-01"),
                expiry_date=it.get("expiry_date", date(2028, 12, 31)),
                total_cartons=total_cartons,
                total_units=total_units,
                cartons_received=cartons_received,
                units_received=units_received,
                shortage_units=shortage_units,
                remarks=it.get("remarks", "")
            )
            db.add(item)

    db.commit()
    return {"status": "success", "arrival_id": arrival.id, "shipment_number": shipment_num, "message": "Shipment arrival logged into stock!"}

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
        total_cartons = sum(getattr(i, 'cartons_dispatched', 0) or 0 for i in t.items)
        trf_date = str(t.transfer_date) if getattr(t, 'transfer_date', None) else str(t.dispatched_at.date()) if t.dispatched_at else str(date.today())

        result.append({
            "id": t.id,
            "transfer_number": t.transfer_number,
            "from_warehouse_id": t.from_warehouse_id,
            "from_warehouse_name": t.from_warehouse.name,
            "from_warehouse_city": t.from_warehouse.city,
            "to_warehouse_id": t.to_warehouse_id,
            "to_warehouse_name": t.to_warehouse.name,
            "to_warehouse_city": t.to_warehouse.city,
            "transfer_date": trf_date,
            "driver_name": t.driver_name or "Assigned Carrier",
            "vehicle_plate": t.vehicle_plate or "LD-AO",
            "status": t.status,
            "notes": t.notes or "",
            "dispatched_at": str(t.dispatched_at),
            "approved_at": str(t.approved_at) if t.approved_at else None,
            "total_cartons": total_cartons,
            "total_units": total_qty,
            "is_incoming": t.to_warehouse_id == current_user.warehouse_id,
            "items": [
                {
                    "sku": i.product.sku,
                    "product_name": i.product.name,
                    "batch_number": i.batch_number or "BAT-GEN",
                    "carton_packing": getattr(i, 'carton_packing', i.product.units_per_carton) or i.product.units_per_carton,
                    "cartons_dispatched": getattr(i, 'cartons_dispatched', 0) or 0,
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
    trf_date = payload.transfer_date or date.today()

    transfer = Transfer(
        transfer_number=trf_num,
        from_warehouse_id=wh_id,
        to_warehouse_id=payload.to_warehouse_id,
        dispatched_by=current_user.id,
        transfer_date=trf_date,
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
            packing = int(it.get("carton_packing") or prod.units_per_carton or 1)
            cartons = int(it.get("cartons_dispatched", 0) or 0)
            dispatched_units = int(it.get("dispatched_qty", 0) or (cartons * packing))
            db.add(TransferItem(
                transfer_id=transfer.id,
                product_id=prod.id,
                batch_number=it.get("batch_number", "BAT-DEFAULT"),
                carton_packing=packing,
                cartons_dispatched=cartons,
                dispatched_qty=dispatched_units,
                received_qty=None
            ))

    db.commit()
    return {"status": "success", "transfer_number": trf_num, "transfer_id": transfer.id, "message": "Transfer dispatched successfully!"}

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

