from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserUpdate, UserResponse
from app.security import get_password_hash
from app.deps import get_current_approver

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(User).order_by(User.id.asc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_details(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งานนี้")
    return user

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(User).where(User.email == user_in.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้วในระบบ")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งานนี้")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None and user_in.email != user.email:
        dup_stmt = select(User).where(User.email == user_in.email)
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
        user.email = user_in.email
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งานนี้")

    if user.id == approver.id:
        raise HTTPException(status_code=400, detail="ไม่สามารถลบบัญชีผู้ใช้งานของตนเองได้")

    await db.delete(user)
    await db.commit()
    return None
