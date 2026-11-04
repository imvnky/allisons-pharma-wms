from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import User, DashboardTile, TileRolePermission, TileSubPermission, RoleSubPermission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or non-existent user")
    return user

def require_permission(tile_key: str, sub_permission_code: str = "VIEW"):
    def permission_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        # Super Admin bypasses check
        if current_user.role.code == "SUPER_ADMIN":
            return current_user

        # 1. Check tile access
        tile = db.query(DashboardTile).filter(DashboardTile.tile_key == tile_key).first()
        if not tile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Module {tile_key} not found")

        has_tile = db.query(TileRolePermission).filter(
            TileRolePermission.tile_id == tile.id,
            TileRolePermission.role_id == current_user.role_id
        ).first()

        if not has_tile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{current_user.role.name}' cannot access module '{tile.title}'"
            )

        # 2. Check sub-permission if specific action required
        if sub_permission_code != "VIEW":
            sub_perm = db.query(TileSubPermission).filter(
                TileSubPermission.tile_id == tile.id,
                TileSubPermission.code == sub_permission_code
            ).first()

            if sub_perm:
                has_sub_perm = db.query(RoleSubPermission).filter(
                    RoleSubPermission.role_id == current_user.role_id,
                    RoleSubPermission.sub_permission_id == sub_perm.id
                ).first()

                if not has_sub_perm:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Action denied: Role '{current_user.role.name}' does not have '{sub_permission_code}' on '{tile.title}'"
                    )

        return current_user

    return permission_checker

