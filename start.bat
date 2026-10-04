@echo off
chcp 65001 > NUL
title Roomie - Meeting Room Booking System

echo 🚀 กำลังเริ่มระบบ Roomie...

:: 1. ตรวจสอบและเริ่มทำงาน Docker Container
echo 📦 ตรวจสอบการทำงานของ PostgreSQL Database Container...
docker start roomie-db 2>NUL
if %errorlevel% neq 0 (
    docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine 2>NUL
)

:: 2. รัน Backend ในหน้าต่างใหม่
echo ⚡ กำลังเริ่มรัน Backend Server (http://localhost:8000)...
start "Roomie Backend Server" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m app.init_db && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 3. รัน Frontend ในหน้าต่างใหม่
echo 🌐 กำลังเริ่มรัน Frontend Web Server (http://localhost:5500)...
start "Roomie Frontend Server" cmd /k "cd /d %~dp0frontend && python -m http.server 5500"

timeout /t 3 /nobreak > NUL

echo.
echo ==================================================
echo 🎉 เปิดใช้งานระบบ Roomie สำเร็จพร้อมใช้งานแล้ว!
echo ==================================================
echo 👉 หน้าเว็บหลัก (Frontend): http://localhost:5500
echo 👉 เอกสาร API (Backend):   http://localhost:8000/docs
echo --------------------------------------------------
echo 🔑 บัญชีทดสอบ:
echo    Admin:    admin@roomie.com / admin123
echo    Approver: approver@roomie.com / approver123
echo    Member:   user@roomie.com / user123
echo ==================================================
echo.

start http://localhost:5500
