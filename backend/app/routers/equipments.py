from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Equipment
from app.schemas import EquipmentCreate, EquipmentResponse
from app.deps import get_current_approver, get_current_admin

router = APIRouter(prefix="/equipments", tags=["Equipments"])

@router.get("", response_model=List[EquipmentResponse])
async def list_equipments(db: AsyncSession = Depends(get_db)):
    stmt = select(Equipment)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(equipment_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Equipment).where(Equipment.id == equipment_id)
    res = await db.execute(stmt)
    eq = res.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return eq

@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    eq_in: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    eq = Equipment(**eq_in.model_dump())
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq

@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    eq_in: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Equipment).where(Equipment.id == equipment_id)
    res = await db.execute(stmt)
    eq = res.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    for field, value in eq_in.model_dump().items():
        setattr(eq, field, value)

    await db.commit()
    await db.refresh(eq)
    return eq

@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    approver = Depends(get_current_approver)
):
    stmt = select(Equipment).where(Equipment.id == equipment_id)
    res = await db.execute(stmt)
    eq = res.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    await db.delete(eq)
    await db.commit()
    return None
