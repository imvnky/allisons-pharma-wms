from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import (
    User, DailyReconciliationRecord, InventorySession, ShipmentArrivalItem,
    ShipmentArrival, Product, Transfer, TransferItem, Warehouse
)
from app.api.v1.reconciliation import get_or_create_session

router = APIRouter(prefix="/alerts", tags=["Quality & Alerts"])


def calculate_warehouse_fefo_batches(
    db: Session,
    warehouse_id: int,
    days_threshold: int = 90,
    include_depleted: bool = False
) -> List[dict]:
    """
    Computes real-time remaining physical stock for each pharmaceutical batch
    using First-Expired, First-Out (FEFO) dynamic depletion.

    Inflows:
      1. ShipmentArrivalItem (Sea containers & local freight verified at this warehouse)
      2. TransferItem (Approved inward transfers to this warehouse)

    Outflows:
      1. DailyReconciliationRecord.sales_qty (Total units sold at this warehouse)
      2. TransferItem.dispatched_qty (Total units transferred out to other branches)
    """
    today = date.today()
    limit_date = today + timedelta(days=days_threshold)

    # 1. Fetch all active products
    products = db.query(Product).filter(Product.is_active == True).all()

    # 2. Pre-calculate total sales per product for this warehouse
    sales_by_product = dict(
        db.query(
            DailyReconciliationRecord.product_id,
            func.coalesce(func.sum(DailyReconciliationRecord.sales_qty), 0)
        )
        .join(InventorySession, DailyReconciliationRecord.session_id == InventorySession.id)
        .filter(InventorySession.warehouse_id == warehouse_id)
        .group_by(DailyReconciliationRecord.product_id)
        .all()
    )

    # 3. Pre-calculate total outward transfers per product from this warehouse
    outward_trf_by_product = dict(
        db.query(
            TransferItem.product_id,
            func.coalesce(func.sum(TransferItem.dispatched_qty), 0)
        )
        .join(Transfer, TransferItem.transfer_id == Transfer.id)
        .filter(Transfer.from_warehouse_id == warehouse_id)
        .group_by(TransferItem.product_id)
        .all()
    )

    result = []

    for prod in products:
        total_outflow = sales_by_product.get(prod.id, 0) + outward_trf_by_product.get(prod.id, 0)

        # Inflow 1: Verified arrivals at this warehouse
        arrival_items = (
            db.query(ShipmentArrivalItem)
            .join(ShipmentArrival, ShipmentArrivalItem.arrival_id == ShipmentArrival.id)
            .filter(
                ShipmentArrival.warehouse_id == warehouse_id,
                ShipmentArrivalItem.product_id == prod.id,
                ShipmentArrival.status == "VERIFIED"
            )
            .order_by(ShipmentArrivalItem.expiry_date.asc(), ShipmentArrivalItem.id.asc())
            .all()
        )

        # Inflow 2: Approved inward transfers received at this warehouse
        inward_transfer_items = (
            db.query(TransferItem)
            .join(Transfer, TransferItem.transfer_id == Transfer.id)
            .filter(
                Transfer.to_warehouse_id == warehouse_id,
                TransferItem.product_id == prod.id,
                Transfer.status == "APPROVED"
            )
            .all()
        )

        # Consolidate batch inflow pools
        batch_pools = []
        for it in arrival_items:
            batch_pools.append({
                "id": it.id,
                "batch_number": it.batch_number,
                "expiry_date": it.expiry_date,
                "initial_units": it.units_received,
                "source": "ARRIVAL"
            })

        for trf_item in inward_transfer_items:
            # Match expiry date from original arrival batch if available
            orig = (
                db.query(ShipmentArrivalItem.expiry_date)
                .filter(ShipmentArrivalItem.batch_number == trf_item.batch_number)
                .first()
            )
            exp_date = orig[0] if orig else today + timedelta(days=365)
            batch_pools.append({
                "id": f"trf-{trf_item.id}",
                "batch_number": trf_item.batch_number or "TRF-BATCH",
                "expiry_date": exp_date,
                "initial_units": trf_item.received_qty or trf_item.dispatched_qty,
                "source": "TRANSFER_IN"
            })

        # Sort batches strictly by FEFO: earliest expiry date first
        batch_pools.sort(key=lambda b: (b["expiry_date"], str(b["id"])))

        # Dynamic FEFO Depletion loop
        remaining_outflow = total_outflow
        for b in batch_pools:
            avail = b["initial_units"]
            if remaining_outflow >= avail:
                depleted = avail
                remaining_outflow -= avail
                remaining = 0
            else:
                depleted = remaining_outflow
                remaining = avail - remaining_outflow
                remaining_outflow = 0

            days_left = (b["expiry_date"] - today).days

            # Determine urgency
            if remaining == 0:
                urgency = "DEPLETED"
            elif days_left < 0:
                urgency = "EXPIRED"
            elif days_left <= 30:
                urgency = "CRITICAL"
            elif days_left <= 60:
                urgency = "WARNING"
            else:
                urgency = "NOTICE"

            # Filter condition: active remaining or explicitly including depleted
            if (remaining > 0 or include_depleted) and (b["expiry_date"] <= limit_date):
                cartons = remaining // prod.units_per_carton if prod.units_per_carton else 0
                loose = remaining % prod.units_per_carton if prod.units_per_carton else remaining
                val_aoa = remaining * float(prod.unit_price or 0)

                result.append({
                    "id": b["id"],
                    "sku": prod.sku,
                    "product_name": prod.name,
                    "category": prod.category,
                    "batch_number": b["batch_number"],
                    "expiry_date": str(b["expiry_date"]),
                    "days_remaining": days_left,
                    "urgency": urgency,
                    "initial_units": b["initial_units"],
                    "depleted_units": depleted,
                    "remaining_units": remaining,
                    "cartons": cartons,
                    "loose_units": loose,
                    "units": remaining,  # backwards compatibility with frontend `it.units`
                    "value_aoa": val_aoa,
                    "source": b["source"]
                })

    # Sort final output: most urgent first (earliest expiry first)
    result.sort(key=lambda x: (x["days_remaining"], x["sku"]))
    return result


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
    warehouse_id: Optional[int] = None,
    include_depleted: bool = False,
    current_user: User = Depends(require_permission("NEAR_EXPIRY", "VIEW")),
    db: Session = Depends(get_db)
):
    wh_id = warehouse_id if (current_user.role.code in ["SUPER_ADMIN", "HQ_ADMIN"] and warehouse_id) else current_user.warehouse_id
    if not wh_id:
        wh_id = 1

    wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
    items = calculate_warehouse_fefo_batches(db, wh_id, days_threshold, include_depleted)

    return {
        "warehouse_id": wh_id,
        "warehouse_name": wh.name if wh else "Warehouse",
        "days_threshold": days_threshold,
        "total_batches": len(items),
        "items": items
    }
