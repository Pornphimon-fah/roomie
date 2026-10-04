# PostgreSQL Database Setup & Configuration

## 1. สถานะคอนเทนเนอร์ Docker (Docker Container Status)

คอนเทนเนอร์ PostgreSQL ถูกสร้างและเปิดใช้งานเรียบร้อยแล้วผ่าน Docker

- **Container Name**: `roomie-postgres`
- **Docker Image**: `postgres:latest`
- **Status**: Running / Ready to accept connections
- **Port Mapping**: `5432:5432`

---

## 2. ข้อมูลสำหรับการเชื่อมต่อฐานข้อมูล (Database Connection Credentials)

| รายการ (Parameter) | ค่าที่กำหนด (Value) |
| :--- | :--- |
| **Host** | `localhost` หรือ `127.0.0.1` |
| **Port** | `5432` |
| **Database Name** | `roomie_db` |
| **Username** | `roomie_user` |
| **Password** | `roomie_password` |
| **Connection String (URI)** | `postgresql://roomie_user:roomie_password@localhost:5432/roomie_db` |

---

## 3. คำสั่งการจัดการคอนเทนเนอร์ (Container Operations)

สามารถจัดการคอนเทนเนอร์ PostgreSQL ได้ผ่านไฟล์ `docker-compose.yml` ที่รากของโปรเจกต์:

- **สั่งรันคอนเทนเนอร์**:
  ```bash
  /Applications/Docker.app/Contents/Resources/bin/docker compose up -d
  ```
- **ตรวจสอบสถานะคอนเทนเนอร์**:
  ```bash
  /Applications/Docker.app/Contents/Resources/bin/docker ps
  ```
- **ทดสอบการเชื่อมต่อฐานข้อมูล**:
  ```bash
  /Applications/Docker.app/Contents/Resources/bin/docker exec roomie-postgres pg_isready -U roomie_user -d roomie_db
  ```
- **เข้าสู่ psql CLI**:
  ```bash
  /Applications/Docker.app/Contents/Resources/bin/docker exec -it roomie-postgres psql -U roomie_user -d roomie_db
  ```
