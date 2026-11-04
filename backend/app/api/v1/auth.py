from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, DashboardTile, TileRolePermission, TileSubPermission, RoleSubPermission
from app.schemas.dto import UserLogin, TokenResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_user_authorized_tiles(user: User, db: Session):
    authorized_tiles = []
    if user.role.code == "SUPER_ADMIN":
        tiles = db.query(DashboardTile).order_by(DashboardTile.sort_order).all()
        for t in tiles:
            authorized_tiles.append({
                "key": t.tile_key,
                "title": t.title,
                "route_path": t.route_path,
                "category": t.category,
                "icon": t.icon,
                "sub_permissions": ["VIEW", "SUBMIT", "EDIT_OWN", "APPROVE", "EXPORT", "EDIT_SALES", "DELETE"]
            })
    else:
        tile_perms = db.query(TileRolePermission).filter(TileRolePermission.role_id == user.role_id).all()
        for tp in tile_perms:
            t = tp.tile
            role_sub_perms = db.query(RoleSubPermission).join(TileSubPermission).filter(
                RoleSubPermission.role_id == user.role_id,
                TileSubPermission.tile_id == t.id
            ).all()
            sub_codes = [rsp.sub_permission.code for rsp in role_sub_perms]
            authorized_tiles.append({
                "key": t.tile_key,
                "title": t.title,
                "route_path": t.route_path,
                "category": t.category,
                "icon": t.icon,
                "sub_permissions": sub_codes
            })
    return authorized_tiles

def format_user_payload(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": {
            "id": user.role.id,
            "code": user.role.code,
            "name": user.role.name
        },
        "warehouse": {
            "id": user.warehouse.id,
            "code": user.warehouse.code,
            "name": user.warehouse.name
        } if user.warehouse else None
    }

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Support login with either username or email
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated")

    authorized_tiles = get_user_authorized_tiles(user, db)

    access_token = create_access_token(data={
        "sub": user.username,
        "user_id": user.id,
        "role_code": user.role.code,
        "warehouse_id": user.warehouse_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_payload(user),
        "authorized_tiles": authorized_tiles
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "user": format_user_payload(current_user),
        "authorized_tiles": get_user_authorized_tiles(current_user, db)
    }


