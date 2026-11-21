from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.entities import (
    User, ApiLog, Transfer, ShipmentArrival, PhysicalCount,
    InventorySession, DailyReconciliationRecord, Product
)

router = APIRouter(prefix="/tracking", tags=["Universal Activity & Audit Tracker"])

@router.get("/inspect")
def inspect_activity_by_id(
    q: str = Query(..., min_length=2, description="Tracking ID, Request Number, Transfer Note, BL, or Ticket"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query_clean = q.strip()
    term = f"%{query_clean}%"
    results = []

    # 1. Search Technical Audit Request IDs (ApiLog)
    logs = (
        db.query(ApiLog)
        .filter(
            or_(
                ApiLog.request_id.ilike(term),
                ApiLog.message.ilike(term)
            )
        )
        .order_by(ApiLog.created_at.desc())
        .limit(5)
        .all()
    )
    for l in logs:
        req_id = getattr(l, "request_id", None) or f"REQ-{l.id:06d}"
        status_color = "bg-rose-50 text-rose-700 border-rose-200" if l.level == "ERROR" else "bg-amber-50 text-amber-700 border-amber-200" if l.level == "WARN" else "bg-emerald-50 text-emerald-700 border-emerald-200"
        results.append({
            "match_type": "SYSTEM_REQUEST",
            "category": "System Forensic Audit Log",
            "reference_id": req_id,
            "title": f"API Gateway Event: {l.activity_title or l.method_name}",
            "status": f"{l.status_code} {l.level}",
            "status_color": status_color,
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            "actor": l.username or "System Engine",
            "location": f"Warehouse #{l.warehouse_id}" if l.warehouse_id else "National / HQ",
            "summary": l.message,
            "target_view": "logs",
            "details": {
                "latency_ms": f"{float(l.latency_ms or 0):.1f} ms",
                "module": l.module_name,
                "method": l.method_name,
                "payload": l.payload,
                "error_stack": l.error_stack
            }
        })

    # 2. Search Inter-Warehouse Transfers (TRN- or Transfer Number)
    transfers = (
        db.query(Transfer)
        .filter(
            or_(
                Transfer.transfer_number.ilike(term),
                Transfer.driver_name.ilike(term),
                Transfer.vehicle_plate.ilike(term)
            )
        )
        .order_by(Transfer.dispatched_at.desc())
        .limit(5)
        .all()
    )
    for t in transfers:
        total_units = sum(i.dispatched_qty for i in t.items)
        total_cartons = sum(getattr(i, "cartons_dispatched", 0) or 0 for i in t.items)
        dest_name = t.to_warehouse.name if t.to_warehouse else "Destination"
        orig_name = t.from_warehouse.name if t.from_warehouse else "Origin"
        status_color = "bg-emerald-50 text-emerald-700 border-emerald-200" if t.status == "APPROVED" else "bg-amber-50 text-amber-700 border-amber-200"
        results.append({
            "match_type": "TRANSFER_NOTE",
            "category": "Inter-Warehouse Transfer Waybill",
            "reference_id": t.transfer_number,
            "title": f"Transfer Note to {dest_name}",
            "status": t.status,
            "status_color": status_color,
            "timestamp": t.dispatched_at.strftime("%Y-%m-%d %H:%M:%S") if t.dispatched_at else "",
            "actor": f"Dispatched by User #{t.dispatched_by}",
            "location": f"{orig_name} → {dest_name}",
            "summary": f"{total_cartons} Cartons ({total_units:,} units) assigned to Carrier {t.driver_name or 'Pedro Manuel'} ({t.vehicle_plate or 'Plate'})",
            "target_view": "shipments",
            "details": {
                "transfer_date": str(t.transfer_date) if getattr(t, "transfer_date", None) else "",
                "driver": t.driver_name,
                "vehicle_plate": t.vehicle_plate,
                "notes": t.notes,
                "items_count": len(t.items),
                "items": [{"sku": i.product.sku if i.product else "", "product": i.product.name if i.product else "", "cartons": getattr(i, "cartons_dispatched", 0), "units": i.dispatched_qty} for i in t.items]
            }
        })

    # 3. Search Shipment Arrivals & Container Intakes (GRN / BL / Container / Shipment Number)
    arrivals = (
        db.query(ShipmentArrival)
        .filter(
            or_(
                ShipmentArrival.shipment_number.ilike(term),
                ShipmentArrival.tracking_bl_number.ilike(term),
                ShipmentArrival.container_number.ilike(term),
                ShipmentArrival.invoice_number.ilike(term),
                ShipmentArrival.supplier_name.ilike(term)
            )
        )
        .order_by(ShipmentArrival.created_at.desc())
        .limit(5)
        .all()
    )
    for a in arrivals:
        units = sum(i.units_received for i in a.items)
        cartons = sum(i.cartons_received for i in a.items)
        shortage = sum(getattr(i, "shortage_units", 0) or 0 for i in a.items)
        wh_name = a.warehouse.name if a.warehouse else "Warehouse"
        results.append({
            "match_type": "INWARD_SHIPMENT",
            "category": "Inward Shipment & Container Intake (GRN)",
            "reference_id": a.shipment_number or f"{a.id:02d}/26",
            "title": f"Shipment Intake: {a.freight_type.capitalize() if a.freight_type else 'Container'} Cargo",
            "status": a.status,
            "status_color": "bg-emerald-50 text-emerald-700 border-emerald-200",
            "timestamp": str(a.received_date),
            "actor": f"Received by User #{a.received_by}",
            "location": wh_name,
            "summary": f"Container {a.container_number or 'N/A'} • BL {a.tracking_bl_number or 'N/A'} • {cartons} Cartons ({units:,} units received, {shortage} shortage)",
            "target_view": "shipments",
            "details": {
                "invoice_number": a.invoice_number,
                "lot_size": a.lot_size,
                "vessel_supplier": a.supplier_name or a.vessel_name,
                "items_count": len(a.items)
            }
        })

    # 4. Search Physical Counting Tickets (CNT- or ticket number)
    counts = (
        db.query(PhysicalCount)
        .filter(
            or_(
                PhysicalCount.ticket_number.ilike(term),
                PhysicalCount.request_id.ilike(term)
            )
        )
        .order_by(PhysicalCount.created_at.desc())
        .limit(5)
        .all()
    )
    for c in counts:
        p_name = c.product.name if c.product else "Medicine"
        p_sku = c.product.sku if c.product else "N/A"
        u_name = c.user.full_name if c.user else "Staff Counter"
        ticket_id = getattr(c, "ticket_number", None) or f"CNT-2026-{c.id:04d}"
        results.append({
            "match_type": "COUNT_TICKET",
            "category": "Floor Stock Count Ticket",
            "reference_id": ticket_id,
            "title": f"Floor Count: {p_name}",
            "status": "VERIFIED IN LEDGER",
            "status_color": "bg-indigo-50 text-indigo-700 border-indigo-200",
            "timestamp": c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            "actor": u_name,
            "location": c.session.warehouse.name if c.session and c.session.warehouse else "Warehouse Floor",
            "summary": f"Logged {c.quantity} {c.count_type.lower()}s for {p_name} ({p_sku})",
            "target_view": "counting",
            "details": {
                "count_type": c.count_type,
                "quantity": c.quantity,
                "reason": c.change_reason_key or "Regular floor audit",
                "request_id": getattr(c, "request_id", None) or "N/A"
            }
        })

    # 5. Search Pharmaceutical Catalog Products (SKU or Name)
    products = (
        db.query(Product)
        .filter(
            or_(
                Product.sku.ilike(term),
                Product.name.ilike(term),
                Product.category.ilike(term)
            )
        )
        .limit(5)
        .all()
    )
    for p in products:
        results.append({
            "match_type": "PRODUCT_SKU",
            "category": "Official Pharmaceutical Catalog",
            "reference_id": p.sku,
            "title": p.name,
            "status": "ACTIVE SKU" if p.is_active else "INACTIVE",
            "status_color": "bg-slate-50 text-slate-700 border-slate-200",
            "timestamp": "Catalog Master",
            "actor": "Amaldina Price List",
            "location": "All Angola Warehouses",
            "summary": f"Category: {p.category} • Pack: {p.units_per_carton} units/ctn ({p.unit_of_measure}) • Price: {float(p.unit_price):,.2f} AOA",
            "target_view": "products",
            "details": {
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "packaging": f"{p.units_per_carton} units per carton",
                "unit_price_aoa": float(p.unit_price)
            }
        })

    return {
        "query": query_clean,
        "total_matches": len(results),
        "results": results
    }
