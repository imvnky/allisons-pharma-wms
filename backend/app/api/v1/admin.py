from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import hash_password
from app.models.entities import (
    User, Role, DashboardTile, TileRolePermission, TileSubPermission,
    RoleSubPermission, LookupType, LookupValue, ApiLog, Warehouse
)
from app.schemas.dto import UserCreate, PasswordReset, LookupValueCreate

router = APIRouter(prefix="/admin", tags=["Super Admin Controls"])

def check_super_admin(current_user: User):
    if current_user.role.code != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Super Admin can access administrative controls"
        )

# ----------------- WAREHOUSES -----------------
@router.get("/warehouses")
def list_warehouses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).order_by(Warehouse.id.asc()).all()
    return [
        {
            "id": w.id,
            "code": w.code,
            "name": w.name,
            "city": w.city
        }
        for w in warehouses
    ]

# ----------------- ROLES & TILES (Screen 7) -----------------
@router.get("/roles")
def list_roles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    roles = db.query(Role).all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "description": r.description,
            "is_system_role": r.is_system_role,
            "user_count": len(r.users)
        }
        for r in roles
    ]

@router.post("/roles")
def create_role(
    code: str, name: str, description: str = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    existing = db.query(Role).filter(Role.code == code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role code already exists")

    new_role = Role(code=code.upper(), name=name, description=description, is_system_role=False)
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return {"status": "success", "role_id": new_role.id, "name": new_role.name}

@router.get("/tiles")
def list_tiles_with_permissions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tiles = db.query(DashboardTile).order_by(DashboardTile.sort_order).all()
    roles = db.query(Role).all()

    result = []
    for t in tiles:
        assigned_roles = [tp.role.name for tp in t.role_permissions]
        assigned_role_ids = [tp.role_id for tp in t.role_permissions]
        sub_perms = [{"id": sp.id, "code": sp.code, "label": sp.label} for sp in t.sub_permissions]

        result.append({
            "id": t.id,
            "tile_key": t.tile_key,
            "title": t.title,
            "route_path": t.route_path,
            "category": t.category,
            "icon": t.icon,
            "assigned_roles": assigned_roles,
            "assigned_role_ids": assigned_role_ids,
            "sub_permissions": sub_perms
        })

    return {
        "tiles": result,
        "available_roles": [{"id": r.id, "code": r.code, "name": r.name} for r in roles]
    }

@router.put("/tiles/{tile_id}/permissions")
def update_tile_permissions(
    tile_id: int,
    role_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    tile = db.query(DashboardTile).filter(DashboardTile.id == tile_id).first()
    if not tile:
        raise HTTPException(status_code=404, detail="Tile not found")

    # Clear existing and reassign
    db.query(TileRolePermission).filter(TileRolePermission.tile_id == tile.id).delete()
    for rid in role_ids:
        db.add(TileRolePermission(tile_id=tile.id, role_id=rid))
    
    db.commit()
    return {"status": "success", "message": f"Updated role permissions for {tile.title}"}

# ----------------- USERS & PASSWORDS -----------------
@router.get("/users")
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": {"id": u.role.id, "code": u.role.code, "name": u.role.name},
            "warehouse": {"id": u.warehouse.id, "name": u.warehouse.name} if u.warehouse else None,
            "is_active": u.is_active,
            "created_at": str(u.created_at)
        }
        for u in users
    ]

@router.post("/users")
def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role_id=payload.role_id,
        warehouse_id=payload.warehouse_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user_id": new_user.id, "username": new_user.username}

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: PasswordReset,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": f"Password reset for {user.username} successful!"}

# ----------------- MASTER DROPDOWNS & LOOKUPS (Screen 8) -----------------
@router.get("/lookups")
def get_all_lookups(db: Session = Depends(get_db)):
    types = db.query(LookupType).all()
    result = []
    for t in types:
        vals = db.query(LookupValue).filter(
            LookupValue.lookup_type_code == t.code
        ).order_by(LookupValue.sort_order.asc()).all()

        result.append({
            "type_code": t.code,
            "type_name": t.name,
            "values": [
                {
                    "id": v.id,
                    "key": v.key,
                    "label": v.label,
                    "sort_order": v.sort_order,
                    "is_active": v.is_active
                }
                for v in vals
            ]
        })
    return result

@router.post("/lookups/values")
def add_lookup_value(
    payload: LookupValueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    ltype = db.query(LookupType).filter(LookupType.code == payload.lookup_type_code).first()
    if not ltype:
        raise HTTPException(status_code=404, detail="Lookup type category not found")

    new_val = LookupValue(
        lookup_type_code=payload.lookup_type_code,
        key=payload.key.upper().replace(" ", "_"),
        label=payload.label,
        sort_order=payload.sort_order or 0,
        is_active=True
    )
    db.add(new_val)
    db.commit()
    db.refresh(new_val)
    return {"status": "success", "id": new_val.id, "key": new_val.key, "label": new_val.label}

# ----------------- API & AUDIT LOGS (Screen 9) -----------------
@router.get("/logs")
def get_api_logs(
    level: Optional[str] = None, # 'INFO', 'WARN', 'ERROR'
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_super_admin(current_user)
    query = db.query(ApiLog)
    if level and level != "ALL":
        query = query.filter(ApiLog.level == level)
    if search:
        query = query.filter(
            (ApiLog.message.ilike(f"%{search}%")) |
            (ApiLog.username.ilike(f"%{search}%")) |
            (ApiLog.method_name.ilike(f"%{search}%"))
        )

    total_count = query.count()
    logs = query.order_by(ApiLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total_count": total_count,
        "logs": [
            {
                "id": l.id,
                "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
                "message": l.message,
                "username": l.username or "Anonymous / System",
                "level": l.level,
                "error_stack": l.error_stack,
                "payload": l.payload,
                "module_name": l.module_name,
                "file_name": l.file_name,
                "method_name": l.method_name,
                "activity_title": l.activity_title,
                "status_code": l.status_code,
                "latency_ms": float(l.latency_ms or 0)
            }
            for l in logs
        ]
    }

