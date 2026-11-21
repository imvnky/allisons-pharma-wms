from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.entities import (
    Warehouse, Role, User, DashboardTile, TileRolePermission,
    TileSubPermission, RoleSubPermission, LookupType, LookupValue, Product
)

def run_migrations():
    """Idempotently adds any newly introduced columns to existing PostgreSQL production tables."""
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("""
                    ALTER TABLE shipment_arrivals ADD COLUMN IF NOT EXISTS shipment_number VARCHAR(50);
                    ALTER TABLE shipment_arrivals ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
                    ALTER TABLE shipment_arrivals ADD COLUMN IF NOT EXISTS lot_size VARCHAR(100);
                    ALTER TABLE shipment_arrivals ADD COLUMN IF NOT EXISTS freight_type VARCHAR(50) DEFAULT 'CONTAINER';

                    ALTER TABLE shipment_arrival_items ADD COLUMN IF NOT EXISTS total_cartons INTEGER DEFAULT 0;
                    ALTER TABLE shipment_arrival_items ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0;
                    ALTER TABLE shipment_arrival_items ADD COLUMN IF NOT EXISTS shortage_units INTEGER DEFAULT 0;
                    ALTER TABLE shipment_arrival_items ADD COLUMN IF NOT EXISTS remarks VARCHAR(255);

                    ALTER TABLE transfers ADD COLUMN IF NOT EXISTS transfer_date DATE;

                    ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS carton_packing INTEGER DEFAULT 1;
                    ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS cartons_dispatched INTEGER DEFAULT 0;

                    ALTER TABLE inventory_sessions ADD COLUMN IF NOT EXISTS audit_cycle_number VARCHAR(50);
                    ALTER TABLE physical_counts ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);
                    ALTER TABLE physical_counts ADD COLUMN IF NOT EXISTS request_id VARCHAR(50);
                    ALTER TABLE daily_reconciliation_records ADD COLUMN IF NOT EXISTS docket_number VARCHAR(50);
                    ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(50);
                """))
                conn.commit()
                print("Database columns verified and migrated successfully.")
    except Exception as e:
        print(f"[Migration Notice] {e}")

def init_db():
    print("Creating all database tables...")
    run_migrations()
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db: Session = SessionLocal()
    try:
        # 1. Warehouses
        if db.query(Warehouse).count() == 0:
            print("Seeding Warehouses...")
            warehouses = [
                Warehouse(code="MULEMBA", name="Mulemba Warehouse", city="Luanda North"),
                Warehouse(code="PALANCA", name="Palanca Warehouse", city="Luanda South"),
                Warehouse(code="LOBITO", name="Lobito Warehouse", city="Benguela Province"),
            ]
            db.add_all(warehouses)
            db.commit()

        mulemba = db.query(Warehouse).filter_by(code="MULEMBA").first()
        palanca = db.query(Warehouse).filter_by(code="PALANCA").first()
        lobito = db.query(Warehouse).filter_by(code="LOBITO").first()

        # 2. Roles
        if db.query(Role).count() == 0:
            print("Seeding Roles...")
            roles = [
                Role(code="SUPER_ADMIN", name="Super Admin", description="System Owner with full administrative control", is_system_role=True),
                Role(code="HQ_ADMIN", name="HQ Admin", description="National overview across all Angola warehouses", is_system_role=True),
                Role(code="SUPERVISOR", name="Warehouse Supervisor", description="Branch Admin managing inventory reconciliation, sales & transfers", is_system_role=True),
                Role(code="CARTON_STAFF", name="Carton Staff", description="Physical carton counter for assigned warehouse", is_system_role=True),
                Role(code="LOOSE_STAFF", name="Loose Staff", description="Physical loose counter for assigned warehouse", is_system_role=True),
                Role(code="DISPLAY_STAFF", name="Display Staff", description="Showcase floor display counter for assigned warehouse", is_system_role=True),
            ]
            db.add_all(roles)
            db.commit()

        role_sa = db.query(Role).filter_by(code="SUPER_ADMIN").first()
        role_hq = db.query(Role).filter_by(code="HQ_ADMIN").first()
        role_sup = db.query(Role).filter_by(code="SUPERVISOR").first()
        role_carton = db.query(Role).filter_by(code="CARTON_STAFF").first()
        role_loose = db.query(Role).filter_by(code="LOOSE_STAFF").first()
        role_display = db.query(Role).filter_by(code="DISPLAY_STAFF").first()

        # 3. Users
        if db.query(User).count() == 0:
            print("Seeding Users...")
            pwd_hash = hash_password("admin123")
            users = [
                User(username="superadmin", email="superadmin@allisons.co.ao", full_name="Master Super Admin", hashed_password=pwd_hash, role_id=role_sa.id, warehouse_id=None),
                User(username="hq.admin", email="hq@allisons.co.ao", full_name="Dr. Amilcar (HQ Director)", hashed_password=pwd_hash, role_id=role_hq.id, warehouse_id=None),
                User(username="venkatesh.j", email="venkatesh@allisons.co.ao", full_name="Venkatesh Joshi", hashed_password=pwd_hash, role_id=role_sup.id, warehouse_id=mulemba.id),
                User(username="carlos.m", email="carlos@allisons.co.ao", full_name="Carlos Mendes", hashed_password=pwd_hash, role_id=role_carton.id, warehouse_id=mulemba.id),
                User(username="antonio.s", email="antonio@allisons.co.ao", full_name="Antonio Silva", hashed_password=pwd_hash, role_id=role_loose.id, warehouse_id=mulemba.id),
                User(username="joao.p", email="joao@allisons.co.ao", full_name="Joao Pinto", hashed_password=pwd_hash, role_id=role_display.id, warehouse_id=mulemba.id),
                User(username="manuel.k", email="manuel@allisons.co.ao", full_name="Manuel Kwanza", hashed_password=pwd_hash, role_id=role_sup.id, warehouse_id=palanca.id),
                User(username="roberto.g", email="roberto@allisons.co.ao", full_name="Roberto Gomez", hashed_password=pwd_hash, role_id=role_sup.id, warehouse_id=lobito.id),
            ]
            db.add_all(users)
            db.commit()

        # 4. Dashboard Tiles
        if db.query(DashboardTile).count() == 0:
            print("Seeding Dashboard Tiles...")
            tiles_data = [
                {"key": "CARTON_COUNTING", "title": "Carton Counting", "path": "/counting/carton", "cat": "Floor Counting", "icon": "Boxes", "order": 1, "roles": [role_sa, role_sup, role_carton]},
                {"key": "LOOSE_COUNTING", "title": "Loose Counting", "path": "/counting/loose", "cat": "Floor Counting", "icon": "Box", "order": 2, "roles": [role_sa, role_sup, role_loose]},
                {"key": "DISPLAY_COUNTING", "title": "Display Counting", "path": "/counting/display", "cat": "Floor Counting", "icon": "Store", "order": 3, "roles": [role_sa, role_sup, role_display]},
                {"key": "RECONCILIATION", "title": "Daily Reconciliation Sheet", "path": "/reconciliation", "cat": "Reconciliation", "icon": "FileSpreadsheet", "order": 4, "roles": [role_sa, role_hq, role_sup]},
                {"key": "SHIPMENTS_ARRIVALS", "title": "Arrivals & Sea Shipments", "path": "/shipments/arrivals", "cat": "Shipments", "icon": "Ship", "order": 5, "roles": [role_sa, role_hq, role_sup]},
                {"key": "TRANSFERS", "title": "Inter-Warehouse Transfers", "path": "/shipments/transfers", "cat": "Shipments", "icon": "ArrowLeftRight", "order": 6, "roles": [role_sa, role_hq, role_sup]},
                {"key": "PRODUCT_DIFFERENCES", "title": "Product Differences", "path": "/alerts/differences", "cat": "Alerts & Quality", "icon": "AlertTriangle", "order": 7, "roles": [role_sa, role_hq, role_sup]},
                {"key": "NEAR_EXPIRY", "title": "Near Expiry Goods", "path": "/alerts/expiry", "cat": "Alerts & Quality", "icon": "Clock", "order": 8, "roles": [role_sa, role_hq, role_sup]},
                {"key": "HQ_MASTER_STOCK", "title": "Master Angola Stock", "path": "/hq/master-stock", "cat": "HQ Executive", "icon": "Globe", "order": 9, "roles": [role_sa, role_hq]},
                {"key": "HQ_AUDIT_MONITOR", "title": "Warehouse Audit Monitor", "path": "/hq/audit-monitor", "cat": "HQ Executive", "icon": "Activity", "order": 10, "roles": [role_sa, role_hq]},
                {"key": "ROLES_AUTHORIZATION", "title": "Role & Tile Manager", "path": "/settings/roles", "cat": "Administration", "icon": "ShieldCheck", "order": 11, "roles": [role_sa]},
                {"key": "MASTER_DROPDOWNS", "title": "Master Dropdowns Manager", "path": "/settings/lookups", "cat": "Administration", "icon": "ListFilter", "order": 12, "roles": [role_sa]},
                {"key": "API_LOGS", "title": "API & System Audit Logs", "path": "/settings/logs", "cat": "Administration", "icon": "Terminal", "order": 13, "roles": [role_sa]},
            ]

            for td in tiles_data:
                tile = DashboardTile(
                    tile_key=td["key"],
                    title=td["title"],
                    route_path=td["path"],
                    category=td["cat"],
                    icon=td["icon"],
                    sort_order=td["order"]
                )
                db.add(tile)
                db.flush()

                # Add sub permissions
                sub_perms = [
                    TileSubPermission(tile_id=tile.id, code="VIEW", label="View Tile & Browse"),
                    TileSubPermission(tile_id=tile.id, code="SUBMIT", label="Submit New Entry"),
                    TileSubPermission(tile_id=tile.id, code="EDIT_OWN", label="Edit Own Submissions"),
                    TileSubPermission(tile_id=tile.id, code="APPROVE", label="Approve / Finalize"),
                    TileSubPermission(tile_id=tile.id, code="EXPORT", label="Export to Excel / CSV"),
                ]
                db.add_all(sub_perms)
                db.flush()

                # Map roles
                for r in td["roles"]:
                    db.add(TileRolePermission(tile_id=tile.id, role_id=r.id))
                    # Assign sub perms to role
                    for sp in sub_perms:
                        db.add(RoleSubPermission(role_id=r.id, sub_permission_id=sp.id))

            db.commit()

        # 5. Lookup Dictionaries
        if db.query(LookupType).count() == 0:
            print("Seeding Lookup Types and Values...")
            types = [
                LookupType(code="DISPLAY_REASON", name="Display Change Justification"),
                LookupType(code="DISCREPANCY_CAUSE", name="Discrepancy / Variance Root Cause"),
                LookupType(code="ARRIVAL_MODE", name="Freight & Arrival Mode"),
                LookupType(code="PACKAGING_UNIT", name="Packaging Unit Type"),
            ]
            db.add_all(types)
            db.flush()

            values = [
                # Display Reasons
                LookupValue(lookup_type_code="DISPLAY_REASON", key="BROKEN_DISPLAY", label="Broken / Damaged on Display Floor", sort_order=1),
                LookupValue(lookup_type_code="DISPLAY_REASON", key="EXPIRED_SHOWCASE", label="Expired on Showcase Shelf", sort_order=2),
                LookupValue(lookup_type_code="DISPLAY_REASON", key="CUSTOMER_SAMPLING", label="Authorized Doctor / Customer Sampling", sort_order=3),
                LookupValue(lookup_type_code="DISPLAY_REASON", key="REPLACED_BATCH", label="Replaced with Fresh Batch from Stock", sort_order=4),
                LookupValue(lookup_type_code="DISPLAY_REASON", key="AUDIT_CORRECTION", label="Previous Day Miscount Correction", sort_order=5),
                # Discrepancy Causes
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="PILFERAGE_SUSPECTED", label="Suspected Pilferage / Floor Loss", sort_order=1),
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="WATER_LEAK", label="Water Leak / Climate Moisture Damage", sort_order=2),
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="TRANSIT_BREAKAGE", label="Damage in Transit / Dock Handling", sort_order=3),
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="SUPPLIER_SHORT", label="Supplier Short Delivery in Inward Container", sort_order=4),
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="MISCOUNT", label="Counting / Sorting Error (Recount Required)", sort_order=5),
                LookupValue(lookup_type_code="DISCREPANCY_CAUSE", key="PROMOTIONAL_SURPLUS", label="Extra Supplier Bonus / Promotional Surplus", sort_order=6),
                # Arrival Modes
                LookupValue(lookup_type_code="ARRIVAL_MODE", key="SEA_SHIPMENT", label="Sea Container Shipment (Vessel)", sort_order=1),
                LookupValue(lookup_type_code="ARRIVAL_MODE", key="LOCAL_SUPPLIER", label="Local Distributor Delivery", sort_order=2),
                LookupValue(lookup_type_code="ARRIVAL_MODE", key="AIR_FREIGHT", label="Air Cargo (Luanda Airport)", sort_order=3),
                # Packaging Units
                LookupValue(lookup_type_code="PACKAGING_UNIT", key="CARTON", label="Master Shipping Carton", sort_order=1),
                LookupValue(lookup_type_code="PACKAGING_UNIT", key="BOX", label="Secondary Pack Box", sort_order=2),
                LookupValue(lookup_type_code="PACKAGING_UNIT", key="BOTTLE", label="Syrup Bottle (100ml)", sort_order=3),
                LookupValue(lookup_type_code="PACKAGING_UNIT", key="VIAL", label="Injectable Vial", sort_order=4),
                LookupValue(lookup_type_code="PACKAGING_UNIT", key="LOOSE_PIECE", label="Individual Loose Unit / Strip", sort_order=5),
            ]
            db.add_all(values)
            db.commit()

        # 6. Pharmaceutical Catalog from Amaldina Price List
        if db.query(Product).count() == 0:
            print("Seeding Official Amaldina Pharmaceutical Catalog...")
            import os
            import json
            json_path = os.path.join(os.path.dirname(__file__), "amaldina_products.json")
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    amaldina_data = json.load(f)
                products = [
                    Product(
                        sku=p["sku"],
                        name=p["name"],
                        category=p["category"],
                        units_per_carton=p.get("units_per_carton", 50),
                        unit_of_measure=p.get("unit_of_measure", "Box"),
                        unit_price=p.get("unit_price", 0.0),
                        is_active=True
                    )
                    for p in amaldina_data
                ]
            else:
                products = [
                    Product(sku="ALIS-AMX-500", name="Amoxicillin 500mg Capsules", category="Antibiotics", units_per_carton=50, unit_of_measure="Box 10x10", unit_price=1200.00),
                    Product(sku="ALIS-PCM-100", name="Paracetamol Syrup 100ml", category="Analgesics & Anti-inflammatory", units_per_carton=50, unit_of_measure="Bottle", unit_price=450.00),
                ]
            db.add_all(products)
            db.commit()
            print(f"Seeded {len(products)} products into catalog.")

        print("Database initialization and seed complete!")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

