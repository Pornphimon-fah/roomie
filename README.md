# 🏢 Roomie - ระบบจองห้องประชุมออนไลน์ (Meeting Room Booking System)

**Roomie** คือเว็บแอปพลิเคชันระบบจองห้องประชุมออนไลน์แบบครบวงจร ออกแบบมาเพื่ออำนวยความสะดวกให้ผู้ใช้งานและองค์กร สามารถค้นหา ตรวจสอบตารางเวลาว่าง จองห้องประชุม แนบสลิปชำระเงิน ตลอดจนระบบผู้ดูแลระบบในการอนุมัติคำขอ จัดการห้องประชุม อุปกรณ์เสริม โปรโมชั่นส่วนลด และสิทธิ์ผู้ใช้งาน

---

## ⚡ วิธีรันระบบด้วยคำสั่งเดียว (One-Click Quick Start)

หากคุณติดตั้งไลบรารีและ Docker ในเครื่องเรียบร้อยแล้ว สามารถเปิดรันระบบทั้งหมด (Database + Backend + Frontend + เปิดเว็บเบราว์เซอร์) ได้ด้วยคำสั่งเดียว:

### 🍎 สำหรับ macOS / Linux:
เปิดโปรแกรม **Terminal** ในโฟลเดอร์โปรเจกต์ แล้วพิมพ์คำสั่ง:
```bash
./start.sh
```
*(หรือจะพิมพ์ `npm start` ก็ได้เช่นกัน)*

---

### 🪟 สำหรับ Windows:
ดับเบิ้ลคลิกที่ไฟล์ **`start.bat`** ในโฟลเดอร์โปรเจกต์ 
หรือเปิด **Command Prompt (cmd)** ในโฟลเดอร์โปรเจกต์แล้วพิมพ์:
```cmd
start.bat
```

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

## 📖 วิธีรันระบบแบบแยกตามขั้นตอน (Manual Step-by-Step)

หากต้องการรันทีละส่วนเพื่อตรวจสอบการทำงาน สามารถรันตามขั้นตอนด้านล่างได้ครับ:

### 🍎 1. ขั้นตอนการรันสำหรับ macOS / Linux

#### Step 1: เปิดใช้งาน PostgreSQL Database (ผ่าน Docker)
```bash
docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine
```

#### Step 2: รันระบบหลังบ้าน (Backend Server - FastAPI)
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m app.init_db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(ระบบหลังบ้านจะรันที่: **`http://localhost:8000`** | ดูเอกสาร API ได้ที่ `http://localhost:8000/docs`)*

#### Step 3: รันระบบหน้าบ้าน (Frontend Web Server)
เปิด Terminal หน้าต่างใหม่ แล้วรันคำสั่ง:
```bash
cd frontend
python3 -m http.server 5500
```
👉 เปิดโปรแกรม Web Browser เข้าไปที่: **`http://localhost:5500`**

---

### 🪟 2. ขั้นตอนการรันสำหรับ Windows

#### Step 1: เปิดใช้งาน PostgreSQL Database (ผ่าน Docker)
```cmd
docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine
```

#### Step 2: รันระบบหลังบ้าน (Backend Server - FastAPI)
```cmd
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python -m app.init_db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(ระบบหลังบ้านจะรันที่: **`http://localhost:8000`** | ดูเอกสาร API ได้ที่ `http://localhost:8000/docs`)*

#### Step 3: รันระบบหน้าบ้าน (Frontend Web Server)
เปิด Command Prompt หน้าต่างใหม่ แล้วรันคำสั่ง:
```cmd
cd frontend
python -m http.server 5500
```
👉 เปิดโปรแกรม Web Browser เข้าไปที่: **`http://localhost:5500`**

---

## 🔑 บัญชีผู้ใช้งานทดสอบในระบบ (Default Test Accounts)

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
├── start.sh                  # สคริปต์รันระบบในคำสั่งเดียวสำหรับ macOS / Linux
├── start.bat                 # สคริปต์รันระบบในคำสั่งเดียวสำหรับ Windows
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
