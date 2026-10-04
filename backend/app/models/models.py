import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Numeric, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ROOM_MANAGER = "room_manager"
    MEMBER = "member"

class RoomStatus(str, enum.Enum):
    AVAILABLE = "available"
    MAINTENANCE = "maintenance"
    BOOKED = "booked"

class BookingMode(str, enum.Enum):
    MEMBER = "MEMBER"
    GUEST = "GUEST"

class BookingStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    CHECKED_IN = "CHECKED_IN"
    NO_SHOW = "NO_SHOW"

class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    PAID = "PAID"
    REFUNDED = "REFUNDED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_rooms = relationship("MeetingRoom", back_populates="assigned_approver")
    bookings = relationship("Booking", foreign_keys="[Booking.user_id]", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(RoomStatus), default=RoomStatus.AVAILABLE, nullable=False)
    standard_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    member_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    requires_approval = Column(Boolean, default=False, nullable=False)
    assigned_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_approver = relationship("User", back_populates="assigned_rooms")
    bookings = relationship("Booking", back_populates="room")

class Equipment(Base):
    __tablename__ = "equipments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    total_quantity = Column(Integer, default=1, nullable=False)
    available_quantity = Column(Integer, default=1, nullable=False)
    standard_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    member_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking_items = relationship("BookingEquipment", back_populates="equipment")

class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    discount_percent = Column(Numeric(5, 2), nullable=True)
    discount_amount = Column(Numeric(10, 2), nullable=True)
    valid_from = Column(DateTime, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    bookings = relationship("Booking", back_populates="promotion")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(50), unique=True, index=True, nullable=False)
    booking_mode = Column(SQLEnum(BookingMode), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    room_id = Column(Integer, ForeignKey("meeting_rooms.id"), nullable=False)
    assigned_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=True)
    
    guest_name = Column(String(255), nullable=True)
    guest_email = Column(String(255), nullable=True)
    guest_phone = Column(String(50), nullable=True)
    
    subject = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    
    room_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    equipment_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_price = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING_APPROVAL, nullable=False)
    is_checked_in = Column(Boolean, default=False, nullable=False)
    check_in_time = Column(DateTime, nullable=True)
    
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    payment_method = Column(String(50), nullable=True)
    slip_url = Column(String(500), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    assigned_approver = relationship("User", foreign_keys=[assigned_approver_id])
    room = relationship("MeetingRoom", back_populates="bookings")
    promotion = relationship("Promotion", back_populates="bookings")
    equipments = relationship("BookingEquipment", back_populates="booking", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="booking")

class BookingEquipment(Base):
    __tablename__ = "booking_equipments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipments.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="equipments")
    equipment = relationship("Equipment", back_populates="booking_items")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
    booking = relationship("Booking", back_populates="notifications")
