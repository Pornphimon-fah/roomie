from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import MeetingRoom, RoomStatus, Booking, BookingStatus
from app.schemas import RoomCreate, RoomResponse
from app.deps import get_current_admin, get_current_approver

router = APIRouter(prefix="/rooms", tags=["Meeting Rooms"])

@router.get("", response_model=List[RoomResponse])
async def list_rooms(
    min_capacity: Optional[int] = Query(None, description="Filter by minimum capacity"),
    search: Optional[str] = Query(None, description="Search by room name or location"),
    available_at_start: Optional[datetime] = Query(None, description="Check availability start time"),
    available_at_end: Optional[datetime] = Query(None, description="Check availability end time"),
    db: AsyncSession = Depends(get_db)
):
    query = select(MeetingRoom)

    if min_capacity:
        query = query.where(MeetingRoom.capacity >= min_capacity)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                MeetingRoom.name.ilike(search_pattern),
                MeetingRoom.location.ilike(search_pattern)
            )
        )

    res = await db.execute(query)
    rooms = res.scalars().all()

    # Filter by date/time availability if requested
    if available_at_start and available_at_end:
        available_rooms = []
        for room in rooms:
            # Check for overlapping active bookings
            overlap_stmt = select(Booking).where(
                and_(
                    Booking.room_id == room.id,
                    Booking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING_APPROVAL, BookingStatus.CHECKED_IN]),
                    Booking.start_time < available_at_end,
                    Booking.end_time > available_at_start
                )
            )
            overlap_res = await db.execute(overlap_stmt)
            if not overlap_res.scalars().first():
                available_rooms.append(room)
        return available_rooms

    return rooms

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(MeetingRoom).where(MeetingRoom.id == room_id)
    res = await db.execute(stmt)
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Meeting room not found")
    return room

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_approver)
):
    room = MeetingRoom(**room_in.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_approver)
):
    stmt = select(MeetingRoom).where(MeetingRoom.id == room_id)
    res = await db.execute(stmt)
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Meeting room not found")

    for field, value in room_in.model_dump().items():
        setattr(room, field, value)

    await db.commit()
    await db.refresh(room)
    return room

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    stmt = select(MeetingRoom).where(MeetingRoom.id == room_id)
    res = await db.execute(stmt)
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Meeting room not found")

    await db.delete(room)
    await db.commit()
    return None
