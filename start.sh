#!/bin/bash
# ==========================================
#  Roomie - One-Click Start Script (macOS / Linux)
# ==========================================

echo "🚀 กำลังเริ่มระบบ Roomie..."

# 1. ตรวจสอบและเริ่มทำงาน Docker PostgreSQL Container
if command -v docker &> /dev/null; then
    echo "📦 ตรวจสอบการทำงานของ PostgreSQL Database Container..."
    if [ ! "$(docker ps -q -f name=roomie-db)" ]; then
        if [ "$(docker ps -aq -f name=roomie-db)" ]; then
            docker start roomie-db > /dev/null
            echo "✅ เริ่มทำงาน Docker Container 'roomie-db' เรียบร้อย"
        else
            docker run -d --name roomie-db -p 5432:5432 -e POSTGRES_DB=roomiedb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:15-alpine > /dev/null
            echo "✅ สร้างและเริ่มทำงาน Docker Container 'roomie-db' เรียบร้อย"
        fi
    else
        echo "✅ Docker Container 'roomie-db' กำลังทำงานอยู่แล้ว"
    fi
fi

# 2. เริ่มทำงานระบบหลังบ้าน (Backend Server - FastAPI)
echo "⚡ กำลังเริ่มรัน Backend Server (http://localhost:8000)..."
if [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
fi

cd backend
python3 -m app.init_db > /dev/null 2>&1
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/roomie_backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 3. เริ่มทำงานระบบหน้าบ้าน (Frontend Web Server)
echo "🌐 กำลังเริ่มรัน Frontend Web Server (http://localhost:5500)..."
nohup python3 -m http.server 5500 --directory frontend > /tmp/roomie_frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "=================================================="
echo "🎉 เปิดใช้งานระบบ Roomie สำเร็จพร้อมใช้งานแล้ว!"
echo "=================================================="
echo "👉 หน้าเว็บหลัก (Frontend): http://localhost:5500"
echo "👉 เอกสาร API (Backend):   http://localhost:8000/docs"
echo "--------------------------------------------------"
echo "🔑 บัญชีทดสอบ:"
echo "   Admin:    admin@roomie.com / admin123"
echo "   Approver: approver@roomie.com / approver123"
echo "   Member:   user@roomie.com / user123"
echo "=================================================="
echo ""

# เปิดเว็บเบราว์เซอร์อัตโนมัติ
open "http://localhost:5500" 2>/dev/null || xdg-open "http://localhost:5500" 2>/dev/null
