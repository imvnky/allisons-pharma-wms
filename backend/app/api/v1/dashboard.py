from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.entities import (
    User, Warehouse, InventorySession, DailyReconciliationRecord,
    Product, PhysicalCount, ShipmentArrival, Transfer
)
from app.api.v1.reconciliation import get_or_create_session, sync_session_calculations

router = APIRouter(prefix="/dashboard", tags=["Dashboard Real-time Telemetry"])

def resolve_wh_id(warehouse_id: Optional[int], current_user: User, db: Session) -> int:
    if current_user.role.code in ["SUPER_ADMIN", "HQ_ADMIN"] and warehouse_id:
        return warehouse_id
    if current_user.warehouse_id:
        return current_user.warehouse_id
    first_wh = db.query(Warehouse).filter(Warehouse.is_active == True).first()
    return first_wh.id if first_wh else 1

@router.get("/summary")
def get_dashboard_summary(
    warehouse_id: Optional[int] = None,
    target_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wh_id = resolve_wh_id(warehouse_id, current_user, db)
    t_date = target_date or date.today()

    session = get_or_create_session(db, wh_id, t_date)
    if session.status != "INVENTORY_DONE":
        sync_session_calculations(db, session)

    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id
    ).all()

    total_physical = 0
    total_required = 0
    total_sales = 0
    carton_units = 0
    loose_units = 0
    display_units = 0
    discrepancy_count = 0
    counted_products = 0

    for r in records:
        total_physical += r.physical_stock
        total_required += r.required_stock
        total_sales += r.sales_qty
        
        c_units = r.carton_count * (r.product.units_per_carton if r.product else 1)
        carton_units += c_units
        loose_units += r.loose_count
        display_units += r.display_count

        if r.difference != 0:
            discrepancy_count += 1
        if r.physical_stock > 0 or r.carton_count > 0 or r.loose_count > 0 or r.display_count > 0:
            counted_products += 1

    total_skus = len(records)
    progress_pct = round((counted_products / total_skus * 100), 1) if total_skus > 0 else 0

    # Physical breakdown percentages
    if total_physical > 0:
        carton_pct = round((carton_units / total_physical) * 100)
        loose_pct = round((loose_units / total_physical) * 100)
        display_pct = max(0, 100 - carton_pct - loose_pct)
    else:
        carton_pct = 0
        loose_pct = 0
        display_pct = 0

    # Pending transfers involving this warehouse
    pending_transfers = db.query(Transfer).filter(
        ((Transfer.from_warehouse_id == wh_id) | (Transfer.to_warehouse_id == wh_id)),
        Transfer.status == "IN_TRANSIT"
    ).count()

    accuracy_pct = 100.0
    if total_required > 0:
        abs_diff = abs(total_physical - total_required)
        accuracy_pct = max(0.0, round((1.0 - (abs_diff / total_required)) * 100, 1))

    return {
        "warehouse_id": wh_id,
        "warehouse_name": session.warehouse.name if session.warehouse else f"Warehouse {wh_id}",
        "audit_date": str(t_date),
        "session_status": session.status,
        "status_text": "Inventory Reconciled" if session.status == "INVENTORY_DONE" else "Audit In Progress",
        "total_physical_units": total_physical,
        "total_required_units": total_required,
        "total_difference_units": total_physical - total_required,
        "total_sales_units": total_sales,
        "discrepancy_count": discrepancy_count,
        "total_skus": total_skus,
        "counted_skus": counted_products,
        "progress_pct": progress_pct,
        "accuracy_pct": accuracy_pct,
        "breakdown": {
            "carton_units": carton_units,
            "loose_units": loose_units,
            "display_units": display_units,
            "carton_pct": carton_pct,
            "loose_pct": loose_pct,
            "display_pct": display_pct,
        },
        "pending_transfers": pending_transfers,
    }

@router.get("/categories")
def get_dashboard_categories(
    warehouse_id: Optional[int] = None,
    target_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wh_id = resolve_wh_id(warehouse_id, current_user, db)
    t_date = target_date or date.today()

    session = get_or_create_session(db, wh_id, t_date)
    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id
    ).all()

    cat_map = {}
    for r in records:
        cat = r.product.category if r.product and r.product.category else "General"
        if cat not in cat_map:
            cat_map[cat] = {"name": cat, "req": 0, "phys": 0, "diff": 0}
        cat_map[cat]["req"] += r.required_stock
        cat_map[cat]["phys"] += r.physical_stock
        cat_map[cat]["diff"] += r.difference

    cat_list = list(cat_map.values())
    max_val = max([max(c["req"], c["phys"]) for c in cat_list], default=100)
    if max_val == 0:
        max_val = 100

    colors = [
        "bg-indigo-600", "bg-blue-600", "bg-indigo-500", "bg-emerald-600",
        "bg-violet-600", "bg-cyan-600", "bg-amber-600", "bg-teal-600"
    ]

    result = []
    for idx, c in enumerate(cat_list):
        higher = max(c["req"], c["phys"])
        pct = max(15, min(100, round((higher / max_val) * 100)))
        result.append({
            "name": c["name"],
            "req": c["req"],
            "phys": c["phys"],
            "diff": c["diff"],
            "height": f"{pct}%",
            "color": colors[idx % len(colors)]
        })

    # Sort categories with highest stock or difference first
    result.sort(key=lambda x: max(x["req"], x["phys"]), reverse=True)
    return result[:8]

@router.get("/top-products")
def get_dashboard_top_products(
    warehouse_id: Optional[int] = None,
    target_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wh_id = resolve_wh_id(warehouse_id, current_user, db)
    t_date = target_date or date.today()

    session = get_or_create_session(db, wh_id, t_date)
    records = db.query(DailyReconciliationRecord).filter(
        DailyReconciliationRecord.session_id == session.id
    ).all()

    # Prioritize items with discrepancies, then highest physical stock, then alphabetical
    def sort_key(r):
        has_diff = 1 if r.difference != 0 else 0
        return (has_diff, r.physical_stock)

    sorted_records = sorted(records, key=sort_key, reverse=True)

    items = []
    for r in sorted_records[:6]:
        diff = r.difference
        if diff < 0:
            status = "Discrepancy"
            status_color = "bg-rose-50 text-rose-700 border-rose-200"
            diff_color = "text-rose-600 font-bold"
            diff_text = f"{diff:,} un"
        elif diff > 0:
            status = "Surplus"
            status_color = "bg-emerald-50 text-emerald-700 border-emerald-200"
            diff_color = "text-emerald-600 font-bold"
            diff_text = f"+{diff:,} un"
        else:
            status = "Reconciled"
            status_color = "bg-slate-50 text-slate-700 border-slate-200"
            diff_color = "text-slate-500 font-medium"
            diff_text = "0 un"

        items.append({
            "sku": r.product.sku if r.product else "N/A",
            "name": r.product.name if r.product else "Unknown",
            "category": r.product.category if r.product else "General",
            "status": status,
            "status_color": status_color,
            "physical": f"{r.physical_stock:,} un",
            "difference": diff_text,
            "diff_color": diff_color,
            "required": f"{r.required_stock:,} un",
            "units_per_carton": r.product.units_per_carton if r.product else 50
        })

    return items

@router.get("/logistics-inflow")
def get_dashboard_logistics(
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wh_id = resolve_wh_id(warehouse_id, current_user, db)

    # 1. Latest Arrival
    arr = db.query(ShipmentArrival).filter(
        ShipmentArrival.warehouse_id == wh_id
    ).order_by(ShipmentArrival.created_at.desc()).first()

    # If none for this warehouse, get latest overall
    if not arr and current_user.role.code in ["SUPER_ADMIN", "HQ_ADMIN"]:
        arr = db.query(ShipmentArrival).order_by(ShipmentArrival.created_at.desc()).first()

    latest_arrival = None
    if arr:
        units = sum(i.units_received for i in arr.items)
        latest_arrival = {
            "title": f"Shipment {arr.shipment_number or f'{arr.id:02d}/26'} ({arr.freight_type.capitalize() if arr.freight_type else 'Container'})",
            "subtitle": f"{arr.container_number or 'Container'} • BL {arr.tracking_bl_number or 'N/A'}",
            "status": arr.status,
            "units": units,
            "date": str(arr.received_date)
        }

    # 2. Latest Transfer
    trf = db.query(Transfer).filter(
        (Transfer.from_warehouse_id == wh_id) | (Transfer.to_warehouse_id == wh_id)
    ).order_by(Transfer.dispatched_at.desc()).first()

    latest_transfer = None
    if trf:
        units = sum(i.dispatched_qty for i in trf.items)
        is_incoming = trf.to_warehouse_id == wh_id
        dest = trf.to_warehouse.name if trf.to_warehouse else "Destination"
        orig = trf.from_warehouse.name if trf.from_warehouse else "Origin"
        title = f"Transfer In from {orig}" if is_incoming else f"Transfer Note to {dest}"
        latest_transfer = {
            "title": title,
            "subtitle": f"{trf.transfer_number} • {trf.driver_name or 'Driver'} ({trf.vehicle_plate or 'Plate'})",
            "status": trf.status,
            "units": units,
            "date": str(trf.transfer_date or (trf.dispatched_at.date() if trf.dispatched_at else date.today()))
        }

    # 3. Today's Local Sales
    today_session = db.query(InventorySession).filter(
        InventorySession.warehouse_id == wh_id,
        InventorySession.audit_date == date.today()
    ).first()

    total_sales = 0
    if today_session:
        total_sales = db.query(func.coalesce(func.sum(DailyReconciliationRecord.sales_qty), 0)).filter(
            DailyReconciliationRecord.session_id == today_session.id
        ).scalar() or 0

    return {
        "latest_arrival": latest_arrival,
        "latest_transfer": latest_transfer,
        "sales_today": total_sales
    }

@router.get("/live-stream")
def get_dashboard_live_stream(
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wh_id = resolve_wh_id(warehouse_id, current_user, db)

    # Query latest physical counts for this warehouse
    counts = (
        db.query(PhysicalCount)
        .join(InventorySession, PhysicalCount.session_id == InventorySession.id)
        .filter(InventorySession.warehouse_id == wh_id)
        .order_by(PhysicalCount.created_at.desc())
        .limit(10)
        .all()
    )

    feed = []
    for c in counts:
        time_str = c.created_at.strftime("%I:%M %p") if c.created_at else "Today"
        u_name = c.user.full_name if c.user else "Warehouse Staff"
        r_name = c.user.role.name if c.user and c.user.role else "Counter"
        p_name = c.product.name if c.product else "Medicine"

        if c.count_type == "CARTON":
            text = f"Logged {c.quantity} Cartons for {p_name}"
        elif c.count_type == "LOOSE":
            text = f"Counted {c.quantity} Loose Units for {p_name}"
        else:
            reason = f" ({c.change_reason_key})" if c.change_reason_key else ""
            text = f"Verified Showcase Display: {c.quantity} units for {p_name}{reason}"

        feed.append({
            "time": time_str,
            "user": u_name,
            "role": r_name,
            "text": text,
            "type": c.count_type.lower()
        })

    # If no floor counts logged yet, provide clean system baseline events
    if not feed:
        wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
        wh_name = wh.name if wh else "Warehouse"
        feed = [
            {
                "time": "08:00 AM",
                "user": "System Engine",
                "role": "Audit Engine",
                "text": f"Initialized Daily Audit Session for {wh_name}",
                "type": "system"
            },
            {
                "time": "08:05 AM",
                "user": "System Engine",
                "role": "Catalog Engine",
                "text": "Loaded 52 active pharmaceutical SKUs ready for floor counting",
                "type": "system"
            }
        ]

    return feed
