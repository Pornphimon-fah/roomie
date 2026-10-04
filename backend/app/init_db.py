import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
from app.models import User, UserRole, MeetingRoom, RoomStatus, Equipment, Promotion
from app.security import get_password_hash

async def init_db():
    print("Starting database tables creation...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

    async with AsyncSessionLocal() as session:
        # 1. Seed Admin User
        admin_stmt = select(User).where(User.email == "admin@roomie.com")
        res = await session.execute(admin_stmt)
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@roomie.com",
                hashed_password=get_password_hash("admin1234"),
                full_name="System Admin",
                phone="081-234-5678",
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            print("Seeded Admin user: admin@roomie.com / admin1234")

        # 2. Seed Room Manager User
        mgr_stmt = select(User).where(User.email == "manager@roomie.com")
        res = await session.execute(mgr_stmt)
        manager = res.scalar_one_or_none()
        if not manager:
            manager = User(
                email="manager@roomie.com",
                hashed_password=get_password_hash("manager1234"),
                full_name="Somchai Room Manager",
                phone="082-345-6789",
                role=UserRole.ROOM_MANAGER,
                is_active=True
            )
            session.add(manager)
            await session.commit()
            await session.refresh(manager)
            print("Seeded Room Manager user: manager@roomie.com / manager1234")

        # 3. Seed Member User
        member_stmt = select(User).where(User.email == "member@roomie.com")
        res = await session.execute(member_stmt)
        member = res.scalar_one_or_none()
        if not member:
            member = User(
                email="member@roomie.com",
                hashed_password=get_password_hash("member1234"),
                full_name="Fahsai Member",
                phone="089-999-8888",
                role=UserRole.MEMBER,
                is_active=True
            )
            session.add(member)
            await session.commit()
            print("Seeded Member user: member@roomie.com / member1234")

        # 4. Seed Meeting Rooms
        room_stmt = select(MeetingRoom)
        res = await session.execute(room_stmt)
        rooms = res.scalars().all()
        if not rooms:
            sample_rooms = [
                MeetingRoom(
                    name="Grand Ballroom A",
                    location="Floor 3, Zone A",
                    capacity=30,
                    description="Executive conference room equipped with 4K projectors, surround sound, and high-end video conferencing system.",
                    status=RoomStatus.AVAILABLE,
                    standard_price=500.00,
                    member_price=350.00,
                    requires_approval=True,
                    assigned_approver_id=manager.id if manager else None,
                    image_url="https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&auto=format&fit=crop&q=80"
                ),
                MeetingRoom(
                    name="Boardroom Executive",
                    location="Floor 2, Zone B",
                    capacity=12,
                    description="Sleek boardroom suitable for VIP management meetings, contract signing, and brain storming.",
                    status=RoomStatus.AVAILABLE,
                    standard_price=300.00,
                    member_price=200.00,
                    requires_approval=False,
                    assigned_approver_id=None,
                    image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80"
                ),
                MeetingRoom(
                    name="Creative Studio",
                    location="Floor 1, Zone C",
                    capacity=8,
                    description="Modern creative room with interactive touch screen whiteboard, beanbags, and fast Wi-Fi.",
                    status=RoomStatus.AVAILABLE,
                    standard_price=200.00,
                    member_price=120.00,
                    requires_approval=False,
                    assigned_approver_id=None,
                    image_url="https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600&auto=format&fit=crop&q=80"
                ),
                MeetingRoom(
                    name="Focus Room 1",
                    location="Floor 1, Zone A",
                    capacity=4,
                    description="Compact quiet room ideal for 1-on-1 interviews, small team syncs, and client calls.",
                    status=RoomStatus.AVAILABLE,
                    standard_price=100.00,
                    member_price=60.00,
                    requires_approval=False,
                    assigned_approver_id=None,
                    image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80"
                )
            ]
            session.add_all(sample_rooms)
            await session.commit()
            print("Seeded 4 sample meeting rooms!")

        # 5. Seed Equipments
        eq_stmt = select(Equipment)
        res = await session.execute(eq_stmt)
        eqs = res.scalars().all()
        if not eqs:
            sample_eqs = [
                Equipment(
                    name="Wireless Microphone (Pair)",
                    description="Dual channel wireless handheld microphones",
                    total_quantity=5,
                    available_quantity=5,
                    standard_price=100.00,
                    member_price=50.00
                ),
                Equipment(
                    name="4K UltraHD Laser Projector",
                    description="High lumens laser projector with HDMI/Wireless casting",
                    total_quantity=3,
                    available_quantity=3,
                    standard_price=200.00,
                    member_price=100.00
                ),
                Equipment(
                    name="Video Conference Polycom System",
                    description="AI Auto-framing camera with 360 speakerphone mic array",
                    total_quantity=2,
                    available_quantity=2,
                    standard_price=300.00,
                    member_price=150.00
                ),
                Equipment(
                    name="Smart Touch Whiteboard 75 inch",
                    description="Interactive digital whiteboard with instant PDF export",
                    total_quantity=4,
                    available_quantity=4,
                    standard_price=150.00,
                    member_price=80.00
                )
            ]
            session.add_all(sample_eqs)
            await session.commit()
            print("Seeded 4 sample extra equipment items!")

        # 6. Seed Promotion
        promo_stmt = select(Promotion).where(Promotion.code == "ROOMIE2026")
        res = await session.execute(promo_stmt)
        promo = res.scalar_one_or_none()
        if not promo:
            promo = Promotion(
                code="ROOMIE2026",
                description="Special launch discount 10% OFF for all member bookings",
                discount_percent=10.00,
                valid_from=datetime.utcnow() - timedelta(days=1),
                valid_until=datetime.utcnow() + timedelta(days=365),
                is_active=True
            )
            session.add(promo)
            await session.commit()
            print("Seeded Promo Code: ROOMIE2026 (10% OFF)")

if __name__ == "__main__":
    asyncio.run(init_db())
