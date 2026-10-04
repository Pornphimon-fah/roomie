from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.models import UserRole, RoomStatus, BookingMode, BookingStatus, PaymentStatus

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.MEMBER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# --- Room Schemas ---
class RoomBase(BaseModel):
    name: str
    location: str
    capacity: int
    description: Optional[str] = None
    status: RoomStatus = RoomStatus.AVAILABLE
    standard_price: Decimal = Decimal("0.00")
    member_price: Decimal = Decimal("0.00")
    requires_approval: bool = False
    assigned_approver_id: Optional[int] = None
    image_url: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Equipment Schemas ---
class EquipmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    total_quantity: int = 1
    available_quantity: int = 1
    standard_price: Decimal = Decimal("0.00")
    member_price: Decimal = Decimal("0.00")

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Promotion Schemas ---
class PromotionBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

class PromotionCreate(PromotionBase):
    pass

class PromotionResponse(PromotionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Booking Equipment Schemas ---
class BookingEquipmentItem(BaseModel):
    equipment_id: int
    quantity: int = 1

class BookingEquipmentResponse(BaseModel):
    id: int
    equipment_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    equipment_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- Booking Schemas ---
class BookingCreate(BaseModel):
    booking_mode: BookingMode
    room_id: int
    subject: str
    purpose: Optional[str] = None
    start_time: datetime
    end_time: datetime
    promo_code: Optional[str] = None
    equipments: Optional[List[BookingEquipmentItem]] = []
    
    # Guest Info (required if booking_mode == GUEST)
    guest_name: Optional[str] = None
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    booking_code: str
    booking_mode: BookingMode
    user_id: Optional[int] = None
    room_id: int
    assigned_approver_id: Optional[int] = None
    promotion_id: Optional[int] = None
    
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    
    subject: str
    purpose: Optional[str] = None
    start_time: datetime
    end_time: datetime
    
    room_price: Decimal
    equipment_price: Decimal
    discount_amount: Decimal
    total_price: Decimal
    
    status: BookingStatus
    is_checked_in: bool
    check_in_time: Optional[datetime] = None
    
    payment_status: PaymentStatus
    payment_method: Optional[str] = None
    slip_url: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    
    room_name: Optional[str] = None
    room_location: Optional[str] = None
    equipments: List[BookingEquipmentResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class BookingApproval(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    rejection_reason: Optional[str] = None

class PaymentUpload(BaseModel):
    payment_method: str = "PROMPTPAY"
    slip_url: str

class PaymentApproval(BaseModel):
    action: str  # "APPROVE" or "REJECT"
