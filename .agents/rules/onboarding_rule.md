# Project Development Rule: Mandatory Document Review

## กฎสำคัญสำหรับระบบพัฒนาโปรเจกต์ Roomie

1. **การอ่านเอกสารก่อนเริ่มงาน (Mandatory Pre-requisite)**:
   ทุกครั้งที่เข้ามาทำงานหรือพัฒนาฟีเจอร์ใดๆ ในโปรเจกต์ **Roomie** AI/Developer **ต้อง** อ่านและทำความเข้าใจเอกสารข้อกำหนด สถาปัตยกรรม และการตัดสินใจในโฟลเดอร์ [`doc/`](file:///Users/fahsai/Roomie/doc) ก่อนเสมอ โดยเฉพาะ:
   - [`doc/system_requirements.md`](file:///Users/fahsai/Roomie/doc/system_requirements.md) (ข้อกำหนดระบบและการตัดสินใจของผู้ใช้)
   - [`doc/database_setup.md`](file:///Users/fahsai/Roomie/doc/database_setup.md) (การเชื่อมต่อและโครงสร้างฐานข้อมูล PostgreSQL)
   - [`doc/architecture_design.md`](file:///Users/fahsai/Roomie/doc/architecture_design.md) (การออกแบบระบบและ Class Diagram)

2. **การยึดถือการตัดสินใจของผู้ใช้ (User Decision Ownership)**:
   - ผู้ใช้ (User) เป็นผู้รับรองและตัดสินใจในข้อกำหนดทุกข้อ
   - ห้ามปรับเปลี่ยน Business Logic หรือ Tech Stack โดยไม่ได้รับความเห็นชอบหรือปรับปรุงเอกสารใน [`doc/`](file:///Users/fahsai/Roomie/doc)

3. **มาตรฐานการพัฒนา (Tech Stack Guidelines)**:
   - **Backend**: Python (FastAPI / Flask / Django ตามมติในเอกสาร)
   - **Database**: PostgreSQL (รันผ่าน Docker container `roomie-postgres`)
   - **Frontend**: HTML5 / Vanilla CSS / JavaScript
