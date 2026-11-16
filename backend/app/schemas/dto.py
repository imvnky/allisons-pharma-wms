from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]
    authorized_tiles: List[Dict[str, Any]]

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: str
    password: str
    role_id: int
    warehouse_id: Optional[int] = None

class PasswordReset(BaseModel):
    new_password: str

class CountSubmission(BaseModel):
    product_id: int
    count_type: str # 'CARTON', 'LOOSE', 'DISPLAY'
    quantity: int
    change_reason_key: Optional[str] = None

class SalesUpdateRequest(BaseModel):
    record_id: int
    sales_qty: int

class RemarksUpdateRequest(BaseModel):
    record_id: int
    remarks: str

class ShipmentArrivalCreate(BaseModel):
    arrival_type: str = "SEA_SHIPMENT"
    shipment_number: Optional[str] = None # e.g. "01/26", "02/26"
    invoice_number: Optional[str] = None
    lot_size: Optional[str] = None
    freight_type: Optional[str] = "CONTAINER" # 'CONTAINER' or 'AIRLOT'
    vessel_name: Optional[str] = None
    tracking_bl_number: Optional[str] = None # BL or AWB Number
    container_number: Optional[str] = None # Container or Airlot Number
    supplier_name: Optional[str] = None
    received_date: date
    items: List[Dict[str, Any]] # product_id, batch_number, expiry_date, total_cartons, total_units, cartons_received, units_received, shortage_units, remarks

class TransferCreate(BaseModel):
    to_warehouse_id: int
    transfer_date: Optional[date] = None # Transfer Initiation Date
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    notes: Optional[str] = None
    items: List[Dict[str, Any]] # product_id, batch_number, carton_packing, cartons_dispatched, dispatched_qty

class LookupValueCreate(BaseModel):
    lookup_type_code: str
    key: str
    label: str
    sort_order: Optional[int] = 0

