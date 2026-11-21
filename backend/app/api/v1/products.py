from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.entities import User, Product
from app.schemas.dto import ProductCreate, ProductUpdate, ProductBulkCreate

router = APIRouter(prefix="/products", tags=["Product Master Catalog"])

@router.get("")
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    if category and category != "All":
        query = query.filter(Product.category == category)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_filter),
                Product.sku.ilike(search_filter),
                Product.category.ilike(search_filter)
            )
        )
    products = query.order_by(Product.name.asc()).all()

    return [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "units_per_carton": p.units_per_carton,
            "unit_of_measure": p.unit_of_measure,
            "unit_price": float(p.unit_price or 0.0),
            "is_active": p.is_active,
            "created_at": str(p.created_at) if p.created_at else ""
        }
        for p in products
    ]

@router.get("/categories")
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cats = db.query(Product.category).distinct().filter(Product.is_active == True).all()
    existing_cats = [c[0] for c in cats if c[0]]
    defaults = [
        "Antibiotics", "Analgesics & Antipyretics", "Anti-inflammatory",
        "Antimalarials", "Cardiovascular", "Gastrointestinal",
        "Vitamins & Minerals", "Respiratory", "Dermatology", "Medical Supplies"
    ]
    all_cats = sorted(list(set(existing_cats + defaults)))
    return all_cats

@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_permission("ROLES_AUTHORIZATION", "SUBMIT")),
    db: Session = Depends(get_db)
):
    sku_clean = payload.sku.strip().upper()
    existing = db.query(Product).filter(Product.sku == sku_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{sku_clean}' already exists ({existing.name})."
        )

    product = Product(
        sku=sku_clean,
        name=payload.name.strip(),
        category=payload.category.strip(),
        units_per_carton=max(1, payload.units_per_carton),
        unit_of_measure=payload.unit_of_measure or "Units",
        unit_price=payload.unit_price or 0.0,
        is_active=True
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return {
        "status": "success",
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "message": f"Medicine '{product.name}' added to catalog!"
    }

@router.put("/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(require_permission("ROLES_AUTHORIZATION", "EDIT_OWN")),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.sku is not None:
        sku_clean = payload.sku.strip().upper()
        if sku_clean != product.sku:
            existing = db.query(Product).filter(Product.sku == sku_clean).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"SKU '{sku_clean}' is already assigned to another medicine.")
            product.sku = sku_clean

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.category is not None:
        product.category = payload.category.strip()
    if payload.units_per_carton is not None:
        product.units_per_carton = max(1, payload.units_per_carton)
    if payload.unit_of_measure is not None:
        product.unit_of_measure = payload.unit_of_measure
    if payload.unit_price is not None:
        product.unit_price = payload.unit_price
    if payload.is_active is not None:
        product.is_active = payload.is_active

    db.commit()
    return {"status": "success", "message": f"Product '{product.name}' updated successfully"}

@router.delete("/{product_id}")
def toggle_product_status(
    product_id: int,
    current_user: User = Depends(require_permission("ROLES_AUTHORIZATION", "APPROVE")),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Soft toggle
    product.is_active = not product.is_active
    db.commit()
    status_str = "activated" if product.is_active else "deactivated"
    return {"status": "success", "message": f"Product '{product.name}' {status_str}."}

@router.post("/bulk")
def bulk_upload_products(
    payload: ProductBulkCreate,
    current_user: User = Depends(require_permission("ROLES_AUTHORIZATION", "SUBMIT")),
    db: Session = Depends(get_db)
):
    created_count = 0
    updated_count = 0

    for item in payload.products:
        sku_clean = item.sku.strip().upper()
        if not sku_clean or not item.name:
            continue

        existing = db.query(Product).filter(Product.sku == sku_clean).first()
        if existing:
            existing.name = item.name.strip()
            existing.category = item.category.strip() or existing.category
            existing.units_per_carton = max(1, item.units_per_carton)
            existing.unit_of_measure = item.unit_of_measure or existing.unit_of_measure
            if item.unit_price:
                existing.unit_price = item.unit_price
            existing.is_active = True
            updated_count += 1
        else:
            new_prod = Product(
                sku=sku_clean,
                name=item.name.strip(),
                category=item.category.strip() or "General Medicine",
                units_per_carton=max(1, item.units_per_carton),
                unit_of_measure=item.unit_of_measure or "Units",
                unit_price=item.unit_price or 0.0,
                is_active=True
            )
            db.add(new_prod)
            created_count += 1

    db.commit()
    return {
        "status": "success",
        "created": created_count,
        "updated": updated_count,
        "total": created_count + updated_count,
        "message": f"Catalog updated: {created_count} new products added, {updated_count} updated."
    }
