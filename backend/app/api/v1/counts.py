from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.entities import User, PhysicalCount, Product, InventorySession
from app.schemas.dto import CountSubmission
from app.api.v1.reconciliation import get_or_create_session

router = APIRouter(prefix="/counts", tags=["Stock Counting"])

@router.post("/submit")
def submit_physical_count(
    payload: CountSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.warehouse_id:
        raise HTTPException(status_code=400, detail="User must be assigned to a warehouse to submit counts")

    # Verify role permissions
    if payload.count_type == "CARTON" and current_user.role.code not in ["CARTON_STAFF", "SUPERVISOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only Carton Staff or Supervisor can log carton counts")
    if payload.count_type == "LOOSE" and current_user.role.code not in ["LOOSE_STAFF", "SUPERVISOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only Loose Staff or Supervisor can log loose counts")
    if payload.count_type == "DISPLAY" and current_user.role.code not in ["DISPLAY_STAFF", "SUPERVISOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only Display Staff or Supervisor can log display counts")

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    session = get_or_create_session(db, current_user.warehouse_id, date.today())

    # Create count record
    count_entry = PhysicalCount(
        session_id=session.id,
        product_id=product.id,
        submitted_by=current_user.id,
        count_type=payload.count_type,
        quantity=max(0, payload.quantity),
        change_reason_key=payload.change_reason_key
    )
    db.add(count_entry)
    db.commit()
    db.refresh(count_entry)

    return {
        "status": "success",
        "count_id": count_entry.id,
        "product_name": product.name,
        "count_type": count_entry.count_type,
        "quantity": count_entry.quantity,
        "submitted_by": current_user.full_name
    }

@router.get("/my-submissions")
def get_my_submissions(
    count_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.warehouse_id:
        return []

    session = get_or_create_session(db, current_user.warehouse_id, date.today())
    query = db.query(PhysicalCount).filter(
        PhysicalCount.session_id == session.id,
        PhysicalCount.submitted_by == current_user.id
    )

    if count_type:
        query = query.filter(PhysicalCount.count_type == count_type)

    submissions = query.order_by(PhysicalCount.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "sku": s.product.sku,
            "product_name": s.product.name,
            "category": s.product.category,
            "units_per_carton": s.product.units_per_carton,
            "count_type": s.count_type,
            "quantity": s.quantity,
            "change_reason": s.change_reason_key,
            "created_at": s.created_at.strftime("%H:%M:%S") if s.created_at else ""
        }
        for s in submissions
    ]

@router.get("/products")
def get_counting_products(
    category: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)
    if category and category != "All":
        query = query.filter(Product.category == category)
    products = query.order_by(Product.name).all()

    return [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "units_per_carton": p.units_per_carton,
            "unit_of_measure": p.unit_of_measure
        }
        for p in products
    ]

