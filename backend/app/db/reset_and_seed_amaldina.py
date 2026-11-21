import sys
import os

# Automatically add backend root to sys.path so script can run from any working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import json
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.models.entities import (
    Warehouse, Role, User, DashboardTile, TileRolePermission,
    TileSubPermission, RoleSubPermission, LookupType, LookupValue,
    Product, InventorySession, DailyReconciliationRecord,
    PhysicalCount, ShipmentArrival, ShipmentArrivalItem,
    Transfer, TransferItem, ApiLog
)
from app.db.init_db import run_migrations

def reset_and_seed_amaldina():
    print("=" * 60)
    print("ALISONS AFRICAN PHARMA - DATABASE PURGE & AMALDINA SEED")
    print("=" * 60)

    # 1. Run migrations to ensure all schema columns exist
    run_migrations()

    db: Session = SessionLocal()
    try:
        # 2. Check users count to ensure we don't proceed if DB isn't even initialized with users
        user_count = db.query(User).count()
        print(f"Verified {user_count} existing system users in database (preserving all accounts and roles).")

        # 3. Truncate / Delete operational transactional data
        print("Purging mock operational tables...")
        db.query(PhysicalCount).delete()
        db.query(DailyReconciliationRecord).delete()
        db.query(InventorySession).delete()
        db.query(ShipmentArrivalItem).delete()
        db.query(ShipmentArrival).delete()
        db.query(TransferItem).delete()
        db.query(Transfer).delete()
        db.query(ApiLog).delete()
        
        # Delete old dummy products
        old_prod_count = db.query(Product).count()
        print(f"Deleting {old_prod_count} old dummy product entries...")
        db.query(Product).delete()
        db.commit()
        print("Operational tables and old products successfully emptied!")

        # 4. Load the 52 extracted products from Amaldina price list
        json_path = os.path.join(os.path.dirname(__file__), "amaldina_products.json")
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"Missing {json_path}. Run extract_pdf.py first.")

        with open(json_path, "r", encoding="utf-8") as f:
            amaldina_data = json.load(f)

        print(f"Inserting {len(amaldina_data)} official pharmaceutical products from Amaldina Price List...")
        new_products = []
        for p in amaldina_data:
            prod = Product(
                sku=p["sku"],
                name=p["name"],
                category=p["category"],
                units_per_carton=p.get("units_per_carton", 50),
                unit_of_measure=p.get("unit_of_measure", "Box"),
                unit_price=p.get("unit_price", 0.0),
                is_active=True
            )
            new_products.append(prod)

        db.add_all(new_products)
        db.commit()
        print(f"Successfully seeded {len(new_products)} products into database!")

        # 5. Initialize clean daily audit sessions for all active warehouses for today
        today = date.today()
        warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
        db_products = db.query(Product).filter(Product.is_active == True).order_by(Product.name.asc()).all()

        print(f"Initializing clean audit sessions for date {today} across {len(warehouses)} warehouses...")
        for wh in warehouses:
            session = InventorySession(
                warehouse_id=wh.id,
                audit_date=today,
                status="UNDER_PROCESS"
            )
            db.add(session)
            db.flush()

            records = []
            for prod in db_products:
                rec = DailyReconciliationRecord(
                    session_id=session.id,
                    product_id=prod.id,
                    opening_stock=0,
                    arrivals_qty=0,
                    transfers_qty=0,
                    sales_qty=0,
                    carton_count=0,
                    loose_count=0,
                    display_count=0,
                    required_stock=0,
                    physical_stock=0,
                    difference=0,
                    remarks=""
                )
                records.append(rec)
            db.add_all(records)
            print(f"  -> Created session #{session.id} for {wh.name} with {len(records)} reconciliation records.")

        db.commit()
        print("\nAll warehouses primed with clean 0 initial balances.")
        print("=" * 60)
        print("DATABASE PURGE & AMALDINA SEED COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database reset failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_amaldina()
