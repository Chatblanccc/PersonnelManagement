@echo off
echo ========================================
echo 教师合同管理系统 - 开发环境启动脚本
echo ========================================

echo.
echo [1/3] 检查 PostgreSQL 服务...
pg_isready -U postgres
if %errorlevel% neq 0 (
    echo PostgreSQL 未运行，请先启动 PostgreSQL 服务！
    pause
    exit /b 1
)

echo.
echo [2/3] 启动后端服务...
cd backend
if not exist venv (
    echo 虚拟环境不存在，正在创建...
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

if not exist .env (
    echo 正在创建 .env 配置文件...
    copy .env.example .env
    echo 请编辑 backend\.env 文件配置数据库连接！
    pause
)

start "后端API" cmd /k "cd /d %cd% && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

cd ..

echo.
echo [3/3] 启动前端服务...
cd frontend

if not exist node_modules (
    echo 正在安装前端依赖...
    call npm install
)

start "前端开发服务器" cmd /k "cd /d %cd% && npm run dev"

cd ..

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo 前端地址: http://localhost:5173
echo 后端API: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo ========================================
echo.
echo 按任意键退出...
pause > nul

