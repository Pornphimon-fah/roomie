# 🏢 Roomie - ระบบจองห้องประชุมออนไลน์ (Meeting Room Booking System)

**Roomie** คือเว็บแอปพลิเคชันระบบจองห้องประชุมออนไลน์แบบครบวงจร ออกแบบมาเพื่ออำนวยความสะดวกให้ผู้ใช้งานและองค์กร สามารถค้นหา ตรวจสอบตารางเวลาว่าง จองห้องประชุม แนบสลิปชำระเงิน ตลอดจนระบบผู้ดูแลระบบในการอนุมัติคำขอ จัดการห้องประชุม อุปกรณ์เสริม โปรโมชั่นส่วนลด และสิทธิ์ผู้ใช้งาน

---

## ✨ ฟีเจอร์เด่นของระบบ (Key Features)

- 📅 **ปฏิทินตารางเวลาแบบยืดหยุ่น (Interactive Room Calendar)**: แสดงสถานะการจองแบบเรียลไทม์ เลือกดูได้ทั้งแบบรายวัน รายสัปดาห์ รายเดือน และรายปี (FullCalendar v6)
- 🏢 **ระบบค้นหาและกรองห้องประชุม**: กรองตามจำนวนรองรับสถานที่ ช่วงเวลาที่ว่าง พร้อมภาพตัวอย่างห้องประชุม
- ⚙️ **การเลือกอุปกรณ์เสริม (Equipment Addons)**: รองรับการเลือกไมโครโฟน โปรเจคเตอร์ หรือชุดเบรคกาแฟตามจำนวนที่ต้องการ
- 💳 **ระบบชำระเงิน & แนบสลิป (Payment & Slip Upload)**: สแกนคิวอาร์โค้ด PromptPay ชำระเงิน แนบไฟล์สลิปภาพ/PDF ได้ทั้งตอนจองหรือแนบย้อนหลัง
- 🏷️ **โค้ดส่วนลด & โปรโมชั่น (Promo Code)**: คำนวณส่วนลด % หรือจำนวนบาทให้อัตโนมัติทันที
- 📊 **แดชบอร์ดผู้ดูแลระบบ (Admin & Approver Dashboard)**:
  - ⏳ **คำขอรออนุมัติ**: อนุมัติ/ปฏิเสธ คำขอจองห้องประชุม
  - 🧾 **ตรวจสอบสลิปชำระเงิน**: เปิดดูรูปสลิปและยืนยันยอดเงิน
  - 🚪 **จัดการห้องประชุม**: เพิ่ม ลบ แก้ไข ข้อมูลและอัปโหลดไฟล์ภาพห้องประชุม
  - 📦 **จัดการอุปกรณ์เสริม**: เพิ่ม ลบ แก้ไข จำนวนสต็อกและราคาอุปกรณ์
  - 🏷️ **จัดการโปรโมชั่น**: สร้างและกำหนดวันหมดอายุของโค้ดส่วนลด
  - 👥 **จัดการผู้ใช้งาน & สิทธิ์**: ปรับสิทธิ์ผู้ใช้งาน (MEMBER, APPROVER, ADMIN) หรือระงับบัญชี
- 🌙 **รองรับ Dark / Light Mode**: ปรับเปลี่ยนธีมสว่างและมืดได้ตามต้องการ พร้อมฟอร์ม Popup ขนาดใหญ่ 2 คอลัมน์ อ่านง่าย

---

## 🛠️ สิ่งที่ต้องมีก่อนติดตั้ง (Prerequisites)

1. **Docker Desktop** (สำหรับรันฐานข้อมูล PostgreSQL): [ดาวน์โหลด Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **Python 3.10 ขึ้นไป** (สำหรับรันระบบหลังบ้าน FastAPI): [ดาวน์โหลด Python](https://www.python.org/downloads/)
3. **Web Browser** (เช่น Google Chrome, Microsoft Edge, Safari, Firefox)

---

## 🚀 ขั้นตอนการเปิดใช้งานสำหรับผู้พัฒนา (Run Dev Guide)

โปรดเลือกดูขั้นตอนตามระบบปฏิบัติการของคุณ (macOS หรือ Windows):

### 🍎 1. ขั้นตอนการรันโปรเจกต์สำหรับ macOS / Linux

#### Step 1: เปิดใช้งาน PostgreSQL Database (ผ่าน Docker)
เปิดโปรแกรม **Terminal** แล้วคัดลอกคำสั่งด้านล่างไปวาง:
```bash
docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine
```

#### Step 2: รันระบบหลังบ้าน (Backend Server - FastAPI)
ในหน้าต่าง **Terminal** เดิม รันคำสั่งทีละบรรทัด:
```bash
# 1. เข้าสู่โฟลเดอร์ backend
cd backend

# 2. สร้างและเปิดใช้งาน Virtual Environment
python3 -m venv venv
source venv/bin/activate

# 3. ติดตั้งไลบรารีทั้งหมด
pip install -r requirements.txt

# 4. สร้างตารางและใส่ข้อมูลเริ่มต้น (Seed Data)
python3 -m app.init_db

# 5. รัน Backend Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(ระบบหลังบ้านจะรันที่: **`http://localhost:8000`** | ดูเอกสาร API ได้ที่ `http://localhost:8000/docs`)*

#### Step 3: รันระบบหน้าบ้าน (Frontend Web Server)
เปิดหน้าต่าง **Terminal ใหม่** (แยกกับระบบหลังบ้าน) แล้วรันคำสั่ง:
```bash
# 1. เข้าสู่โฟลเดอร์ frontend
cd frontend

# 2. รัน Web Server บนพอร์ต 5500
python3 -m http.server 5500
```
👉 เปิดโปรแกรม Web Browser เข้าไปที่: **`http://localhost:5500`**

---

### 🪟 2. ขั้นตอนการรันโปรเจกต์สำหรับ Windows

#### Step 1: เปิดใช้งาน PostgreSQL Database (ผ่าน Docker)
เปิดโปรแกรม **Command Prompt (cmd)** หรือ **PowerShell** แล้วคัดลอกคำสั่งด้านล่างไปวาง:
```cmd
docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine
```

#### Step 2: รันระบบหลังบ้าน (Backend Server - FastAPI)
ในหน้าต่าง **Command Prompt / PowerShell** เดิม รันคำสั่งทีละบรรทัด:
```cmd
:: 1. เข้าสู่โฟลเดอร์ backend
cd backend

:: 2. สร้างและเปิดใช้งาน Virtual Environment
python -m venv venv
venv\Scripts\activate

:: 3. ติดตั้งไลบรารีทั้งหมด
pip install -r requirements.txt

:: 4. สร้างตารางและใส่ข้อมูลเริ่มต้น (Seed Data)
python -m app.init_db

:: 5. รัน Backend Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(ระบบหลังบ้านจะรันที่: **`http://localhost:8000`** | ดูเอกสาร API ได้ที่ `http://localhost:8000/docs`)*

#### Step 3: รันระบบหน้าบ้าน (Frontend Web Server)
เปิดหน้าต่าง **Command Prompt / PowerShell ใหม่** (แยกกับระบบหลังบ้าน) แล้วรันคำสั่ง:
```cmd
:: 1. เข้าสู่โฟลเดอร์ frontend
cd frontend

:: 2. รัน Web Server บนพอร์ต 5500
python -m http.server 5500
```
👉 เปิดโปรแกรม Web Browser เข้าไปที่: **`http://localhost:5500`**

---

## 🔑 บัญชีผู้ใช้งานทดสอบในระบบ (Default Test Accounts)

คุณสามารถใช้บัญชีทดสอบที่ระบบสร้างไว้ให้ เพื่อลองเข้าใช้งานในสิทธิ์ต่างๆ ได้ทันที:

| สิทธิ์การใช้งาน (Role) | อีเมล (Email) | รหัสผ่าน (Password) | คำอธิบายสิทธิ์ |
|---|---|---|---|
| 👑 **System Admin** | `admin@roomie.com` | `admin123` | ผู้ดูแลระบบสูงสุด สามารถเข้าถึงทุกเมนู รวมถึงจัดการผู้ใช้ |
| 🛡️ **Approver** | `approver@roomie.com` | `approver123` | ผู้อนุมัติการจอง และตรวจสลิปชำระเงิน |
| 👤 **Member** | `user@roomie.com` | `user123` | สมาชิกผู้ขอจองห้องประชุมทั่วไป |

---

## 🏗️ สถาปัตยกรรมเทคโนโลยี (Tech Stack)

* **Frontend**: HTML5, Vanilla CSS3 (Modern Glassmorphism & HSL Color System), JavaScript (ES6+ Vanilla), FullCalendar v6, SweetAlert2, FontAwesome 6
* **Backend**: Python 3.11, FastAPI (Asynchronous Web Framework), SQLAlchemy 2.0 (Async ORM), Pydantic v2, Passlib (BCrypt Password Hashing), PyJWT (Bearer Token Auth)
* **Database**: PostgreSQL 15 (Docker Container)

---

## 📁 โครงสร้างโฟลเดอร์หลัก (Project Structure)

```text
Roomie/
├── backend/                  # ระบบบริการหลังบ้าน (FastAPI)
│   ├── app/
│   │   ├── models/           # Database Models (SQLAlchemy)
│   │   ├── routers/          # API Endpoint Routers (Rooms, Bookings, Users, ฯลฯ)
│   │   ├── schemas/          # Data Validation Schemas (Pydantic)
│   │   ├── static/uploads/   # โฟลเดอร์เก็บไฟล์ภาพที่อัปโหลด (Slips & Room Images)
│   │   ├── init_db.py        # สคริปต์สร้างฐานข้อมูลและเพิ่มข้อมูลทดสอบ
│   │   └── main.py           # จุดเริ่มต้น FastAPI Application
│   └── requirements.txt      # รายชื่อไลบรารี Python
├── frontend/                 # ระบบหน้าบ้าน (HTML/CSS/JS)
│   ├── index.html            # โครงสร้างหน้าเว็บหลัก
│   ├── styles.css            # สไตล์ CSS และการตั้งค่าธีมสว่าง/มืด
│   └── app.js                # Logic การทำงานและการเชื่อมต่อ API
├── doc/                      # เอกสารอ้างอิงสถาปัตยกรรมและข้อกำหนดระบบ
└── README.md                 # เอกสารแนะนำการติดตั้งและใช้งานระบบ
```
