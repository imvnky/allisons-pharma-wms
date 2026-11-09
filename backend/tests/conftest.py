import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import app.core.database as db_module
from app.core.database import Base, get_db
from app.models.entities import (
    Warehouse, Role, User, Product, DashboardTile, TileRolePermission,
    TileSubPermission, RoleSubPermission, LookupType, LookupValue
)
from app.core.security import hash_password, create_access_token
from app.main import app

# Create in-memory SQLite engine for lightning-fast, isolated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Rebind the global engine and SessionLocal so middleware and background calls use test DB
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal


def seed_test_database(db):
    """Seeds baseline reference data needed for tests."""
    # 1. Warehouses
    mulemba = Warehouse(code="MULEMBA", name="Mulemba Warehouse", city="Luanda North")
    palanca = Warehouse(code="PALANCA", name="Palanca Warehouse", city="Luanda South")
    lobito = Warehouse(code="LOBITO", name="Lobito Warehouse", city="Benguela Province")
    db.add_all([mulemba, palanca, lobito])
    db.commit()

    # 2. Roles
    role_sa = Role(code="SUPER_ADMIN", name="Super Admin", is_system_role=True)
    role_hq = Role(code="HQ_ADMIN", name="HQ Admin", is_system_role=True)
    role_sup = Role(code="SUPERVISOR", name="Supervisor", is_system_role=True)
    role_carton = Role(code="CARTON_STAFF", name="Carton Staff", is_system_role=True)
    role_loose = Role(code="LOOSE_STAFF", name="Loose Staff", is_system_role=True)
    role_display = Role(code="DISPLAY_STAFF", name="Display Staff", is_system_role=True)
    db.add_all([role_sa, role_hq, role_sup, role_carton, role_loose, role_display])
    db.commit()

    # 3. Users
    pwd = hash_password("testpass123")
    user_sa = User(username="admin.test", full_name="Super Admin", hashed_password=pwd, role_id=role_sa.id, warehouse_id=None)
    user_hq = User(username="hq.test", full_name="HQ Director", hashed_password=pwd, role_id=role_hq.id, warehouse_id=None)
    user_sup = User(username="supervisor.mulemba", full_name="Mulemba Sup", hashed_password=pwd, role_id=role_sup.id, warehouse_id=mulemba.id)
    user_sup_palanca = User(username="supervisor.palanca", full_name="Palanca Sup", hashed_password=pwd, role_id=role_sup.id, warehouse_id=palanca.id)
    user_carton = User(username="counter.carton", full_name="Carton Counter", hashed_password=pwd, role_id=role_carton.id, warehouse_id=mulemba.id)
    user_loose = User(username="counter.loose", full_name="Loose Counter", hashed_password=pwd, role_id=role_loose.id, warehouse_id=mulemba.id)
    user_display = User(username="counter.display", full_name="Display Counter", hashed_password=pwd, role_id=role_display.id, warehouse_id=mulemba.id)
    db.add_all([user_sa, user_hq, user_sup, user_sup_palanca, user_carton, user_loose, user_display])
    db.commit()

    # 4. Products
    p1 = Product(sku="SKU-AMX-500", name="Amoxicillin 500mg", category="Antibiotics", units_per_carton=24, unit_of_measure="Box 10x10", unit_price=1200.0)
    p2 = Product(sku="SKU-PCM-100", name="Paracetamol Syrup 100ml", category="Analgesics & Antipyretics", units_per_carton=48, unit_of_measure="Bottle", unit_price=450.0)
    p3 = Product(sku="SKU-IBU-400", name="Ibuprofen 400mg", category="Anti-inflammatory", units_per_carton=50, unit_of_measure="Box 10x10", unit_price=950.0)
    db.add_all([p1, p2, p3])
    db.commit()

    # 5. Dashboard Tiles and Permissions
    tiles_data = [
        ("CARTON_COUNTING", "Carton Counting", "/counting/carton", [role_sa, role_sup, role_carton]),
        ("LOOSE_COUNTING", "Loose Counting", "/counting/loose", [role_sa, role_sup, role_loose]),
        ("DISPLAY_COUNTING", "Display Counting", "/counting/display", [role_sa, role_sup, role_display]),
        ("RECONCILIATION", "Reconciliation Sheet", "/reconciliation", [role_sa, role_hq, role_sup]),
        ("SHIPMENTS_ARRIVALS", "Arrivals", "/shipments/arrivals", [role_sa, role_hq, role_sup]),
        ("TRANSFERS", "Transfers", "/shipments/transfers", [role_sa, role_hq, role_sup]),
        ("PRODUCT_DIFFERENCES", "Differences", "/alerts/differences", [role_sa, role_hq, role_sup]),
        ("NEAR_EXPIRY", "Near Expiry", "/alerts/expiry", [role_sa, role_hq, role_sup]),
        ("HQ_MASTER_STOCK", "Master Stock", "/hq/master-stock", [role_sa, role_hq]),
        ("HQ_AUDIT_MONITOR", "Audit Monitor", "/hq/audit-monitor", [role_sa, role_hq]),
    ]
    for key, title, path, roles in tiles_data:
        tile = DashboardTile(tile_key=key, title=title, route_path=path, category="Operations", sort_order=1)
        db.add(tile)
        db.flush()

        sub_codes = ["VIEW", "SUBMIT", "EDIT_OWN", "APPROVE", "EXPORT"]
        sub_objs = [TileSubPermission(tile_id=tile.id, code=c, label=c) for c in sub_codes]
        db.add_all(sub_objs)
        db.flush()

        for r in roles:
            db.add(TileRolePermission(tile_id=tile.id, role_id=r.id))
            for sp in sub_objs:
                db.add(RoleSubPermission(role_id=r.id, sub_permission_id=sp.id))
    db.commit()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    seed_test_database(session)
    session.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Yield a fresh DB session for each test function."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_auth_headers(username: str, role_code: str, user_id: int, warehouse_id: int = None):
    """Helper to generate JWT bearer headers for any test user."""
    token = create_access_token({
        "sub": username,
        "role_code": role_code,
        "user_id": user_id,
        "warehouse_id": warehouse_id
    })
    return {"Authorization": f"Bearer {token}"}
