from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Promotion
from app.schemas import PromotionCreate, PromotionResponse
from app.deps import get_current_approver

router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.get("", response_model=List[PromotionResponse])
async def list_promotions(db: AsyncSession = Depends(get_db)):
    stmt = select(Promotion).order_by(Promotion.id.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/validate/{code}", response_model=PromotionResponse)
async def validate_promo_code(code: str, db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    stmt = select(Promotion).where(
        and_(
            Promotion.code == code,
            Promotion.is_active == True,
            Promotion.valid_from <= now,
            Promotion.valid_until >= now
        )
    )
    res = await db.execute(stmt)
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=400, detail="รหัสส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว")
    return promo

@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    promo_in: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Promotion).where(Promotion.code == promo_in.code)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="รหัสส่วนลดนี้มีอยู่แล้วในระบบ")

    promo = Promotion(**promo_in.model_dump())
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return promo

@router.put("/{promo_id}", response_model=PromotionResponse)
async def update_promotion(
    promo_id: int,
    promo_in: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Promotion).where(Promotion.id == promo_id)
    res = await db.execute(stmt)
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสส่วนลดนี้")

    for field, value in promo_in.model_dump().items():
        setattr(promo, field, value)

    await db.commit()
    await db.refresh(promo)
    return promo

@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promotion(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Promotion).where(Promotion.id == promo_id)
    res = await db.execute(stmt)
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสส่วนลดนี้")

    await db.delete(promo)
    await db.commit()
    return None
