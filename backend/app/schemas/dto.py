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
    arrival_type: str
    vessel_name: Optional[str] = None
    tracking_bl_number: Optional[str] = None
    container_number: Optional[str] = None
    supplier_name: Optional[str] = None
    received_date: date
    items: List[Dict[str, Any]] # product_id, batch_number, expiry_date, cartons, units

class TransferCreate(BaseModel):
    to_warehouse_id: int
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None
    notes: Optional[str] = None
    items: List[Dict[str, Any]] # product_id, batch_number, dispatched_qty

class LookupValueCreate(BaseModel):
    lookup_type_code: str
    key: str
    label: str
    sort_order: Optional[int] = 0

