from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Promotion
from app.schemas import PromotionCreate, PromotionResponse
from app.deps import get_current_admin

router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.get("", response_model=List[PromotionResponse])
async def list_promotions(db: AsyncSession = Depends(get_db)):
    stmt = select(Promotion)
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
        raise HTTPException(status_code=400, detail="Invalid or expired promotion code")
    return promo

@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    promo_in: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    stmt = select(Promotion).where(Promotion.code == promo_in.code)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Promotion code already exists")

    promo = Promotion(**promo_in.model_dump())
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return promo
