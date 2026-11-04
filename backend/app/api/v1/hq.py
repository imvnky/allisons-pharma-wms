from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import (
    User, Warehouse, InventorySession, DailyReconciliationRecord, Product
)
from app.api.v1.reconciliation import get_or_create_session

router = APIRouter(prefix="/hq", tags=["HQ Executive Oversight"])

@router.get("/warehouse-status")
def get_warehouse_status(
    audit_date: date = date.today(),
    current_user: User = Depends(require_permission("HQ_AUDIT_MONITOR", "VIEW")),
    db: Session = Depends(get_db)
):
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    results = []

    for w in warehouses:
        session = db.query(InventorySession).filter(
            InventorySession.warehouse_id == w.id,
            InventorySession.audit_date == audit_date
        ).first()

        status = session.status if session else "NOT_STARTED"
        total_skus = db.query(Product).filter(Product.is_active == True).count()
        
        counted_skus = 0
        total_stock = 0
        total_sales = 0
        discrepancies_count = 0

        if session:
            records = db.query(DailyReconciliationRecord).filter(DailyReconciliationRecord.session_id == session.id).all()
            for r in records:
                if r.physical_stock > 0 or r.carton_count > 0 or r.loose_count > 0:
                    counted_skus += 1
                total_stock += r.physical_stock
                total_sales += r.sales_qty
                if r.difference != 0:
                    discrepancies_count += 1

        # Supervisor
        supervisor = db.query(User).filter(
            User.warehouse_id == w.id,
            User.role.has(code="SUPERVISOR")
        ).first()

        results.append({
            "warehouse_id": w.id,
            "warehouse_code": w.code,
            "warehouse_name": w.name,
            "city": w.city,
            "status": status,
            "counted_skus": counted_skus,
            "total_skus": total_skus,
            "progress_pct": round((counted_skus / total_skus * 100), 1) if total_skus else 0,
            "total_stock": total_stock,
            "total_sales": total_sales,
            "discrepancies_count": discrepancies_count,
            "supervisor_name": supervisor.full_name if supervisor else "Unassigned",
            "finalized_at": session.finalized_at if session else None
        })

    return results

@router.get("/master-inventory")
def get_master_inventory(
    audit_date: date = date.today(),
    warehouse_code: Optional[str] = None, # 'ALL', 'MULEMBA', 'PALANCA', 'LOBITO'
    product_category: Optional[str] = None,
    search_query: Optional[str] = None,
    sales_tier: Optional[str] = None, # 'ALL', 'HIGH', 'MODERATE', 'SLOW', 'ZERO'
    current_user: User = Depends(require_permission("HQ_MASTER_STOCK", "VIEW")),
    db: Session = Depends(get_db)
):
    # Ensure sessions exist for today for all 3 warehouses
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    sessions = {}
    for w in warehouses:
        sessions[w.code] = get_or_create_session(db, w.id, audit_date)

    # Base products query
    prod_query = db.query(Product).filter(Product.is_active == True)
    if product_category and product_category != "All":
        prod_query = prod_query.filter(Product.category == product_category)
    if search_query:
        prod_query = prod_query.filter(
            (Product.name.ilike(f"%{search_query}%")) | (Product.sku.ilike(f"%{search_query}%"))
        )
    products = prod_query.all()

    master_list = []
    for p in products:
        mulemba_stock = 0
        palanca_stock = 0
        lobito_stock = 0
        total_sales = 0
        total_diff = 0

        for w in warehouses:
            sess = sessions.get(w.code)
            rec = db.query(DailyReconciliationRecord).filter(
                DailyReconciliationRecord.session_id == sess.id,
                DailyReconciliationRecord.product_id == p.id
            ).first() if sess else None

            stock = rec.physical_stock if rec else 0
            sales = rec.sales_qty if rec else 0
            diff = rec.difference if rec else 0

            if w.code == "MULEMBA":
                mulemba_stock = stock
            elif w.code == "PALANCA":
                palanca_stock = stock
            elif w.code == "LOBITO":
                lobito_stock = stock

            total_sales += sales
            total_diff += diff

        total_angola = mulemba_stock + palanca_stock + lobito_stock

        # Filter by sales tier if requested
        if sales_tier == "HIGH" and total_sales < 500:
            continue
        elif sales_tier == "MODERATE" and not (100 <= total_sales < 500):
            continue
        elif sales_tier == "SLOW" and not (0 < total_sales < 100):
            continue
        elif sales_tier == "ZERO" and total_sales > 0:
            continue

        master_list.append({
            "product_id": p.id,
            "sku": p.sku,
            "product_name": p.name,
            "category": p.category,
            "units_per_carton": p.units_per_carton,
            "mulemba_stock": mulemba_stock,
            "palanca_stock": palanca_stock,
            "lobito_stock": lobito_stock,
            "total_angola_stock": total_angola,
            "total_sales_today": total_sales,
            "net_difference": total_diff,
            "status": "Optimal" if total_angola > 1000 else ("Low Stock" if total_angola > 200 else "Critical Low")
        })

    return {
        "audit_date": str(audit_date),
        "total_items": len(master_list),
        "records": master_list
    }

