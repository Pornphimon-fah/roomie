import os
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import (
    Booking, BookingMode, BookingStatus, PaymentStatus,
    MeetingRoom, Equipment, BookingEquipment, Promotion, Notification, User, UserRole
)
from app.schemas import (
    BookingCreate, BookingResponse, BookingApproval,
    PaymentUpload, PaymentApproval, BookingEquipmentResponse
)
from app.deps import get_current_user_optional, get_current_user, get_current_approver, get_current_admin

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def generate_booking_code() -> str:
    digits = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"RM-{digits}"

async def auto_release_no_shows(db: AsyncSession):
    now = datetime.utcnow()
    # Find bookings that started more than 15 minutes ago, not checked in, and still APPROVED or PENDING_APPROVAL
    cutoff = now - timedelta(minutes=15)
    stmt = select(Booking).where(
        and_(
            Booking.start_time <= cutoff,
            Booking.is_checked_in == False,
            Booking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING_APPROVAL])
        )
    )
    res = await db.execute(stmt)
    no_shows = res.scalars().all()
    if no_shows:
        for b in no_shows:
            b.status = BookingStatus.NO_SHOW
        await db.commit()

def build_booking_response(b: Booking) -> BookingResponse:
    equip_responses = []
    if hasattr(b, "equipments") and b.equipments:
        for item in b.equipments:
            equip_name = item.equipment.name if item.equipment else None
            equip_responses.append(
                BookingEquipmentResponse(
                    id=item.id,
                    equipment_id=item.equipment_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                    equipment_name=equip_name
                )
            )
    
    return BookingResponse(
        id=b.id,
        booking_code=b.booking_code,
        booking_mode=b.booking_mode,
        user_id=b.user_id,
        room_id=b.room_id,
        assigned_approver_id=b.assigned_approver_id,
        promotion_id=b.promotion_id,
        guest_name=b.guest_name,
        guest_email=b.guest_email,
        guest_phone=b.guest_phone,
        subject=b.subject,
        purpose=b.purpose,
        start_time=b.start_time,
        end_time=b.end_time,
        room_price=b.room_price,
        equipment_price=b.equipment_price,
        discount_amount=b.discount_amount,
        total_price=b.total_price,
        status=b.status,
        is_checked_in=b.is_checked_in,
        check_in_time=b.check_in_time,
        payment_status=b.payment_status,
        payment_method=b.payment_method,
        slip_url=b.slip_url,
        rejection_reason=b.rejection_reason,
        created_at=b.created_at,
        room_name=b.room.name if b.room else None,
        room_location=b.room.location if b.room else None,
        equipments=equip_responses
    )

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    b_in: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    await auto_release_no_shows(db)
    now = datetime.utcnow()

    # 1. Enforce 15-day Advance Booking Limit
    max_advance_date = now + timedelta(days=15)
    if b_in.start_time > max_advance_date:
        raise HTTPException(
            status_code=400,
            detail="สามารถจองล่วงหน้าได้ไม่เกิน 15 วัน"
        )
    if b_in.start_time < now - timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="เวลาเริ่มต้นต้องไม่อยู่ในอดีต")

    # 2. Enforce Booking Slot Duration Limit (30 mins to 8 hours)
    duration_seconds = (b_in.end_time - b_in.start_time).total_seconds()
    if duration_seconds < 1800 or duration_seconds > 28800:
        raise HTTPException(
            status_code=400,
            detail="ระยะเวลาจองต้องอยู่ระหว่าง 30 นาที ถึง 8 ชั่วโมง"
        )

    # 3. Mode validation
    if b_in.booking_mode == BookingMode.GUEST:
        if not b_in.guest_name or not b_in.guest_email or not b_in.guest_phone:
            raise HTTPException(status_code=400, detail="กรุณากรอกชื่อ อีเมล และเบอร์โทรศัพท์ผู้ติดต่อสำหรับบุคคลทั่วไป")
    elif b_in.booking_mode == BookingMode.MEMBER:
        if not current_user:
            raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบเพื่อใช้สิทธิ์ราคาสมาชิก")

    # 4. Fetch Room
    room_stmt = select(MeetingRoom).where(MeetingRoom.id == b_in.room_id)
    room_res = await db.execute(room_stmt)
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลห้องประชุมนี้")

    # 5. Overlap Protection
    overlap_stmt = select(Booking).where(
        and_(
            Booking.room_id == b_in.room_id,
            Booking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING_APPROVAL, BookingStatus.CHECKED_IN]),
            Booking.start_time < b_in.end_time,
            Booking.end_time > b_in.start_time
        )
    )
    overlap_res = await db.execute(overlap_stmt)
    if overlap_res.scalars().first():
        raise HTTPException(status_code=400, detail="ห้องประชุมนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกช่วงเวลาอื่น")

    # 6. Calculate Prices (Member vs Guest)
    is_member = (b_in.booking_mode == BookingMode.MEMBER)
    room_hourly_rate = room.member_price if is_member else room.standard_price
    hours = Decimal(str(duration_seconds / 3600.0))
    room_price_total = Decimal(str(room_hourly_rate)) * hours

    # Equipment Pricing & Stock Check
    equip_price_total = Decimal("0.00")
    equip_items_to_create = []

    if b_in.equipments:
        for item in b_in.equipments:
            eq_stmt = select(Equipment).where(Equipment.id == item.equipment_id)
            eq_res = await db.execute(eq_stmt)
            eq = eq_res.scalar_one_or_none()
            if not eq:
                raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูลอุปกรณ์เสริม ID {item.equipment_id}")
            if eq.available_quantity < item.quantity:
                raise HTTPException(status_code=400, detail=f"จำนวนอุปกรณ์เสริมไม่เพียงพอ: {eq.name} (คงเหลือเพียง {eq.available_quantity} ชิ้น)")

            unit_rate = eq.member_price if is_member else eq.standard_price
            subtotal = Decimal(str(unit_rate)) * Decimal(item.quantity)
            equip_price_total += subtotal
            equip_items_to_create.append((eq, item.quantity, unit_rate, subtotal))

    # Promo Code Discount Calculation
    discount_amount = Decimal("0.00")
    promotion_id = None
    if b_in.promo_code:
        promo_stmt = select(Promotion).where(
            and_(
                Promotion.code == b_in.promo_code,
                Promotion.is_active == True,
                Promotion.valid_from <= now,
                Promotion.valid_until >= now
            )
        )
        promo_res = await db.execute(promo_stmt)
        promo = promo_res.scalar_one_or_none()
        if not promo:
            raise HTTPException(status_code=400, detail="รหัสส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว")
        promotion_id = promo.id
        subtotal_before_discount = room_price_total + equip_price_total
        if promo.discount_percent:
            discount_amount = (subtotal_before_discount * Decimal(str(promo.discount_percent))) / Decimal("100.00")
        elif promo.discount_amount:
            discount_amount = Decimal(str(promo.discount_amount))

    total_price = max(Decimal("0.00"), (room_price_total + equip_price_total) - discount_amount)

    # 7. Determine Approval Status
    # Guest bookings or rooms requiring approval default to PENDING_APPROVAL
    requires_approval = room.requires_approval or (b_in.booking_mode == BookingMode.GUEST)
    initial_status = BookingStatus.PENDING_APPROVAL if requires_approval else BookingStatus.APPROVED

    booking_code = generate_booking_code()
    booking = Booking(
        booking_code=booking_code,
        booking_mode=b_in.booking_mode,
        user_id=current_user.id if current_user else None,
        room_id=b_in.room_id,
        assigned_approver_id=room.assigned_approver_id,
        promotion_id=promotion_id,
        guest_name=b_in.guest_name,
        guest_email=b_in.guest_email,
        guest_phone=b_in.guest_phone,
        subject=b_in.subject,
        purpose=b_in.purpose,
        start_time=b_in.start_time,
        end_time=b_in.end_time,
        room_price=room_price_total,
        equipment_price=equip_price_total,
        discount_amount=discount_amount,
        total_price=total_price,
        status=initial_status,
        payment_status=PaymentStatus.UNPAID
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Create Booking Equipment Items
    for eq, qty, u_price, sub in equip_items_to_create:
        bk_eq = BookingEquipment(
            booking_id=booking.id,
            equipment_id=eq.id,
            quantity=qty,
            unit_price=u_price,
            subtotal=sub
        )
        db.add(bk_eq)
        # Deduct available quantity
        eq.available_quantity = max(0, eq.available_quantity - qty)

    # Create Notification
    notif = Notification(
        user_id=current_user.id if current_user else None,
        booking_id=booking.id,
        title="Booking Request Submitted",
        message=f"Booking {booking_code} for {room.name} created. Status: {initial_status.value}"
    )
    db.add(notif)
    await db.commit()

    # Re-query booking with relationships
    full_stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking.id)
    res = await db.execute(full_stmt)
    full_booking = res.scalar_one()

    return build_booking_response(full_booking)

@router.get("/code/{booking_code}", response_model=BookingResponse)
async def get_booking_by_code(booking_code: str, db: AsyncSession = Depends(get_db)):
    await auto_release_no_shows(db)
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.booking_code == booking_code)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking code not found")
    return build_booking_response(booking)

@router.get("/my", response_model=List[BookingResponse])
async def list_my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await auto_release_no_shows(db)
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.user_id == current_user.id).order_by(Booking.created_at.desc())
    res = await db.execute(stmt)
    bookings = res.scalars().all()
    return [build_booking_response(b) for b in bookings]

@router.get("", response_model=List[BookingResponse])
async def list_all_bookings(
    status_filter: Optional[BookingStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    await auto_release_no_shows(db)
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    )
    if status_filter:
        stmt = stmt.where(Booking.status == status_filter)
    stmt = stmt.order_by(Booking.created_at.desc())
    res = await db.execute(stmt)
    bookings = res.scalars().all()
    return [build_booking_response(b) for b in bookings]

@router.post("/{booking_id}/approve", response_model=BookingResponse)
async def approve_or_reject_booking(
    booking_id: int,
    approval: BookingApproval,
    db: AsyncSession = Depends(get_db),
    approver: User = Depends(get_current_approver)
):
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if approval.action == "APPROVE":
        if booking.payment_status != PaymentStatus.PAID:
            raise HTTPException(
                status_code=400,
                detail="ไม่สามารถอนุมัติการจองได้ เนื่องจากผู้ใช้งานยังไม่ได้ชำระเงิน หรือสลิปชำระเงินยังไม่ผ่านการอนุมัติ (สถานะต้องเป็น PAID ก่อนเท่านั้น)"
            )
        booking.status = BookingStatus.APPROVED
        msg = f"คำขอจองห้อง {booking.room.name} (รหัส {booking.booking_code}) ของคุณได้รับการอนุมัติเรียบร้อยแล้ว!"
    elif approval.action == "REJECT":
        booking.status = BookingStatus.REJECTED
        booking.rejection_reason = approval.rejection_reason
        msg = f"Your booking {booking.booking_code} was REJECTED. Reason: {approval.rejection_reason}"
        
        # Restore equipment quantities
        for item in booking.equipments:
            if item.equipment:
                item.equipment.available_quantity += item.quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use APPROVE or REJECT")

    notif = Notification(
        user_id=booking.user_id,
        booking_id=booking.id,
        title=f"Booking Status Update: {booking.status.value}",
        message=msg
    )
    db.add(notif)
    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)

@router.post("/{booking_id}/checkin", response_model=BookingResponse)
async def checkin_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    await auto_release_no_shows(db)
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.NO_SHOW]:
        raise HTTPException(status_code=400, detail=f"Cannot check in. Booking status is {booking.status.value}")

    now = datetime.utcnow()
    # Check-in allowed window: from 15 minutes before start_time up to start_time + 15 minutes
    earliest_checkin = booking.start_time - timedelta(minutes=15)
    latest_checkin = booking.start_time + timedelta(minutes=15)

    if now < earliest_checkin:
        raise HTTPException(status_code=400, detail="Check-in is not open yet. Please wait until 15 minutes before meeting start time.")
    if now > latest_checkin:
        booking.status = BookingStatus.NO_SHOW
        await db.commit()
        raise HTTPException(status_code=400, detail="Check-in window expired (15 minutes after start). Booking marked as NO-SHOW.")

    booking.is_checked_in = True
    booking.check_in_time = now
    booking.status = BookingStatus.CHECKED_IN
    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)

@router.post("/{booking_id}/upload-slip", response_model=BookingResponse)
async def upload_payment_slip(
    booking_id: int,
    payment_in: PaymentUpload,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.payment_method = payment_in.payment_method
    booking.slip_url = payment_in.slip_url
    booking.payment_status = PaymentStatus.PENDING_VERIFICATION
    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)

@router.post("/{booking_id}/upload-slip-file", response_model=BookingResponse)
async def upload_payment_slip_file(
    booking_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบรายการจองนี้")

    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(
            status_code=400,
            detail="รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะไฟล์ภาพ (.jpg, .jpeg, .png, .webp) หรือเอกสาร (.pdf) เท่านั้น"
        )

    upload_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads", "slips")
    os.makedirs(upload_dir, exist_ok=True)

    new_filename = f"slip_{booking_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(upload_dir, new_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"http://localhost:8000/static/uploads/slips/{new_filename}"
    booking.payment_method = "PROMPTPAY"
    booking.slip_url = file_url
    booking.payment_status = PaymentStatus.PENDING_VERIFICATION
    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)

@router.post("/{booking_id}/verify-payment", response_model=BookingResponse)
async def verify_payment(
    booking_id: int,
    approval: PaymentApproval,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if approval.action == "APPROVE":
        booking.payment_status = PaymentStatus.PAID
    elif approval.action == "REJECT":
        booking.payment_status = PaymentStatus.UNPAID
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)

@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Booking).options(
        selectinload(Booking.room),
        selectinload(Booking.equipments).selectinload(BookingEquipment.equipment)
    ).where(Booking.id == booking_id)
    res = await db.execute(stmt)
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.NO_SHOW]:
        raise HTTPException(status_code=400, detail=f"Booking is already {booking.status.value}")

    now = datetime.utcnow()
    # 3-day Cancellation Rule
    min_cancel_deadline = booking.start_time - timedelta(days=3)
    if now > min_cancel_deadline:
        raise HTTPException(
            status_code=400,
            detail="Bookings can only be cancelled at least 3 days in advance before the meeting date."
        )

    booking.status = BookingStatus.CANCELLED
    if booking.payment_status == PaymentStatus.PAID:
        booking.payment_status = PaymentStatus.PENDING_REFUND

    # Restore equipment stock
    for item in booking.equipments:
        if item.equipment:
            item.equipment.available_quantity += item.quantity

    notif = Notification(
        user_id=booking.user_id,
        booking_id=booking.id,
        title="Booking Cancelled",
        message=f"Booking {booking.booking_code} was successfully cancelled."
    )
    db.add(notif)
    await db.commit()
    await db.refresh(booking)
    return build_booking_response(booking)
