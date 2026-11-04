from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Numeric, Date, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False) # 'MULEMBA', 'PALANCA', 'LOBITO'
    name = Column(String(100), nullable=False)
    city = Column(String(50), default="Luanda")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="warehouse")
    sessions = relationship("InventorySession", back_populates="warehouse")
    arrivals = relationship("ShipmentArrival", back_populates="warehouse")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False) # 'SUPER_ADMIN', 'HQ_ADMIN', 'SUPERVISOR', etc.
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="role")
    tile_permissions = relationship("TileRolePermission", back_populates="role", cascade="all, delete-orphan")
    sub_permissions = relationship("RoleSubPermission", back_populates="role", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True) # None for HQ/SuperAdmin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = relationship("Role", back_populates="users")
    warehouse = relationship("Warehouse", back_populates="users")

class DashboardTile(Base):
    __tablename__ = "dashboard_tiles"

    id = Column(Integer, primary_key=True, index=True)
    tile_key = Column(String(50), unique=True, nullable=False) # 'RECONCILIATION', 'CARTON_COUNTING', etc.
    title = Column(String(100), nullable=False)
    route_path = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False) # 'Floor Counting', 'Reconciliation', 'Shipments', etc.
    icon = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)

    role_permissions = relationship("TileRolePermission", back_populates="tile", cascade="all, delete-orphan")
    sub_permissions = relationship("TileSubPermission", back_populates="tile", cascade="all, delete-orphan")

class TileRolePermission(Base):
    __tablename__ = "tile_role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    tile_id = Column(Integer, ForeignKey("dashboard_tiles.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)

    tile = relationship("DashboardTile", back_populates="role_permissions")
    role = relationship("Role", back_populates="tile_permissions")

class TileSubPermission(Base):
    __tablename__ = "tile_sub_permissions"

    id = Column(Integer, primary_key=True, index=True)
    tile_id = Column(Integer, ForeignKey("dashboard_tiles.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False) # 'VIEW', 'SUBMIT', 'EDIT_SALES', 'APPROVE'
    label = Column(String(100), nullable=False)

    tile = relationship("DashboardTile", back_populates="sub_permissions")
    role_assignments = relationship("RoleSubPermission", back_populates="sub_permission", cascade="all, delete-orphan")

class RoleSubPermission(Base):
    __tablename__ = "role_sub_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    sub_permission_id = Column(Integer, ForeignKey("tile_sub_permissions.id", ondelete="CASCADE"), nullable=False)

    role = relationship("Role", back_populates="sub_permissions")
    sub_permission = relationship("TileSubPermission", back_populates="role_assignments")

class LookupType(Base):
    __tablename__ = "lookup_types"

    code = Column(String(50), primary_key=True) # 'DISPLAY_REASON', 'DISCREPANCY_CAUSE', etc.
    name = Column(String(100), nullable=False)

    values = relationship("LookupValue", back_populates="lookup_type", cascade="all, delete-orphan")

class LookupValue(Base):
    __tablename__ = "lookup_values"

    id = Column(Integer, primary_key=True, index=True)
    lookup_type_code = Column(String(50), ForeignKey("lookup_types.code"), nullable=False)
    key = Column(String(50), nullable=False)
    label = Column(String(150), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lookup_type = relationship("LookupType", back_populates="values")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)
    units_per_carton = Column(Integer, default=1, nullable=False)
    unit_of_measure = Column(String(20), default="Units")
    unit_price = Column(Numeric(12, 2), default=0.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class InventorySession(Base):
    __tablename__ = "inventory_sessions"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    audit_date = Column(Date, nullable=False)
    status = Column(String(30), default="UNDER_PROCESS") # 'NOT_STARTED', 'UNDER_PROCESS', 'INVENTORY_DONE'
    finalized_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    warehouse = relationship("Warehouse", back_populates="sessions")
    reconciliation_records = relationship("DailyReconciliationRecord", back_populates="session", cascade="all, delete-orphan")
    physical_counts = relationship("PhysicalCount", back_populates="session", cascade="all, delete-orphan")

class DailyReconciliationRecord(Base):
    __tablename__ = "daily_reconciliation_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("inventory_sessions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    opening_stock = Column(Integer, default=0, nullable=False)
    arrivals_qty = Column(Integer, default=0, nullable=False)
    transfers_qty = Column(Integer, default=0, nullable=False)
    sales_qty = Column(Integer, default=0, nullable=False) # Entered manually by Supervisor
    
    carton_count = Column(Integer, default=0, nullable=False)
    loose_count = Column(Integer, default=0, nullable=False)
    display_count = Column(Integer, default=0, nullable=False)
    
    required_stock = Column(Integer, default=0, nullable=False)
    physical_stock = Column(Integer, default=0, nullable=False)
    difference = Column(Integer, default=0, nullable=False)
    
    remarks = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    session = relationship("InventorySession", back_populates="reconciliation_records")
    product = relationship("Product")

class PhysicalCount(Base):
    __tablename__ = "physical_counts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("inventory_sessions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    count_type = Column(String(20), nullable=False) # 'CARTON', 'LOOSE', 'DISPLAY'
    quantity = Column(Integer, nullable=False)
    change_reason_key = Column(String(50), nullable=True) # Required for display change
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InventorySession", back_populates="physical_counts")
    product = relationship("Product")
    user = relationship("User")

class ShipmentArrival(Base):
    __tablename__ = "shipment_arrivals"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    arrival_type = Column(String(50), nullable=False) # 'SEA_SHIPMENT', 'LOCAL_SUPPLIER'
    vessel_name = Column(String(100), nullable=True)
    tracking_bl_number = Column(String(100), nullable=True)
    container_number = Column(String(100), nullable=True)
    supplier_name = Column(String(150), nullable=True)
    received_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    received_date = Column(Date, nullable=False)
    status = Column(String(30), default="VERIFIED")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    warehouse = relationship("Warehouse", back_populates="arrivals")
    items = relationship("ShipmentArrivalItem", back_populates="arrival", cascade="all, delete-orphan")

class ShipmentArrivalItem(Base):
    __tablename__ = "shipment_arrival_items"

    id = Column(Integer, primary_key=True, index=True)
    arrival_id = Column(Integer, ForeignKey("shipment_arrivals.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(50), nullable=False)
    expiry_date = Column(Date, nullable=False)
    cartons_received = Column(Integer, default=0, nullable=False)
    units_received = Column(Integer, default=0, nullable=False)

    arrival = relationship("ShipmentArrival", back_populates="items")
    product = relationship("Product")

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(50), unique=True, index=True, nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    dispatched_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    dispatched_at = Column(DateTime(timezone=True), server_default=func.now())
    driver_name = Column(String(100), nullable=True)
    vehicle_plate = Column(String(50), nullable=True)
    status = Column(String(30), default="IN_TRANSIT") # 'DRAFT', 'IN_TRANSIT', 'APPROVED', 'DISCREPANCY'
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    items = relationship("TransferItem", back_populates="transfer", cascade="all, delete-orphan")
    from_warehouse = relationship("Warehouse", foreign_keys=[from_warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])

class TransferItem(Base):
    __tablename__ = "transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(50), nullable=True)
    dispatched_qty = Column(Integer, nullable=False)
    received_qty = Column(Integer, nullable=True)

    transfer = relationship("Transfer", back_populates="items")
    product = relationship("Product")

class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    message = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    level = Column(String(20), default="INFO", index=True) # 'INFO', 'WARN', 'ERROR'
    error_stack = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True)
    module_name = Column(String(100), nullable=True)
    file_name = Column(String(100), nullable=True)
    method_name = Column(String(100), nullable=True)
    activity_title = Column(String(150), nullable=True)
    status_code = Column(Integer, nullable=True)
    latency_ms = Column(Numeric(8, 2), nullable=True)

