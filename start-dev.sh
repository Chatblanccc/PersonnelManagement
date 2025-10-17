#!/bin/bash

echo "========================================"
echo "教师合同管理系统 - 开发环境启动脚本"
echo "========================================"

# 检查 PostgreSQL
echo ""
echo "[1/3] 检查 PostgreSQL 服务..."
if ! pg_isready -U postgres > /dev/null 2>&1; then
    echo "PostgreSQL 未运行，请先启动 PostgreSQL 服务！"
    echo "Ubuntu/Debian: sudo systemctl start postgresql"
    echo "macOS: brew services start postgresql"
    exit 1
fi

# 启动后端
echo ""
echo "[2/3] 启动后端服务..."
cd backend

if [ ! -d "venv" ]; then
    echo "虚拟环境不存在，正在创建..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

if [ ! -f ".env" ]; then
    echo "正在创建 .env 配置文件..."
    cp .env.example .env
    echo "请编辑 backend/.env 文件配置数据库连接！"
    read -p "按 Enter 继续..."
fi

uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# 启动前端
echo ""
echo "[3/3] 启动前端服务..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "正在安装前端依赖..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo "服务启动完成！"
echo "========================================"
echo "前端地址: http://localhost:5173"
echo "后端API: http://localhost:8000"
echo "API文档: http://localhost:8000/docs"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 捕获 Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# 等待
wait

