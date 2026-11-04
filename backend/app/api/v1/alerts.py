from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import (
    User, DailyReconciliationRecord, InventorySession, ShipmentArrivalItem, ShipmentArrival, Product
)
from app.api.v1.reconciliation import get_or_create_session

router = APIRouter(prefix="/alerts", tags=["Quality & Alerts"])

@router.get("/differences")
def get_product_differences(
    current_user: User = Depends(require_permission("PRODUCT_DIFFERENCES", "VIEW")),
    db: Session = Depends(get_db)
):
    wh_id = current_user.warehouse_id
    if not wh_id:
        wh_id = 1 # default to Mulemba if HQ

    session = get_or_create_session(db, wh_id, date.today())
    
    # Filter strictly for difference != 0
    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id,
        DailyReconciliationRecord.difference != 0
    ).all()

    result = []
    for r in records:
        price = float(r.product.unit_price or 0)
        impact = r.difference * price
        var_pct = round((r.difference / r.required_stock * 100), 2) if r.required_stock else 0

        result.append({
            "record_id": r.id,
            "sku": r.product.sku,
            "product_name": r.product.name,
            "category": r.product.category,
            "required_stock": r.required_stock,
            "physical_stock": r.physical_stock,
            "difference": r.difference,
            "variance_pct": var_pct,
            "financial_impact_aoa": impact,
            "remarks": r.remarks or "Remarks pending",
            "status": "Documented" if r.remarks else "Pending Review"
        })

    return {
        "warehouse_name": session.warehouse.name,
        "total_discrepancies": len(result),
        "items": result
    }

@router.get("/near-expiry")
def get_near_expiry_goods(
    days_threshold: int = 90,
    current_user: User = Depends(require_permission("NEAR_EXPIRY", "VIEW")),
    db: Session = Depends(get_db)
):
    wh_id = current_user.warehouse_id
    if not wh_id:
        wh_id = 1

    today = date.today()
    limit_date = today + timedelta(days=days_threshold)

    # Find arrival items stored in this warehouse expiring soon
    items = db.query(ShipmentArrivalItem).join(ShipmentArrival).filter(
        ShipmentArrival.warehouse_id == wh_id,
        ShipmentArrivalItem.expiry_date <= limit_date
    ).order_by(ShipmentArrivalItem.expiry_date.asc()).all()

    result = []
    for it in items:
        days_left = (it.expiry_date - today).days
        urgency = "CRITICAL" if days_left <= 30 else ("WARNING" if days_left <= 60 else "NOTICE")
        if days_left < 0:
            urgency = "EXPIRED"

        result.append({
            "id": it.id,
            "sku": it.product.sku,
            "product_name": it.product.name,
            "batch_number": it.batch_number,
            "expiry_date": str(it.expiry_date),
            "days_remaining": days_left,
            "urgency": urgency,
            "cartons": it.cartons_received,
            "units": it.units_received,
            "value_aoa": it.units_received * float(it.product.unit_price or 0)
        })

    return {
        "total_batches": len(result),
        "items": result
    }

