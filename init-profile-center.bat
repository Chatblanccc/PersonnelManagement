@echo off
REM 个人中心功能初始化脚本 (Windows)
echo ========================================
echo 教师合同管理系统 - 个人中心功能初始化
echo ========================================
echo.

REM 检查 PostgreSQL 连接信息
set /p DB_HOST="请输入数据库主机 (默认: localhost): " || set DB_HOST=localhost
set /p DB_PORT="请输入数据库端口 (默认: 5432): " || set DB_PORT=5432
set /p DB_NAME="请输入数据库名称 (默认: personnel_management): " || set DB_NAME=personnel_management
set /p DB_USER="请输入数据库用户名 (默认: postgres): " || set DB_USER=postgres
set /p DB_PASS="请输入数据库密码: "

echo.
echo [1/4] 执行数据库迁移...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f backend\add_profile_features.sql
if %errorlevel% neq 0 (
    echo 错误: 数据库迁移失败！
    pause
    exit /b 1
)
echo ✓ 数据库迁移完成

echo.
echo [2/4] 创建上传目录...
if not exist "backend\uploads\avatars" (
    mkdir backend\uploads\avatars
    echo ✓ 创建目录: backend\uploads\avatars
) else (
    echo ✓ 目录已存在: backend\uploads\avatars
)

if not exist "uploads\avatars" (
    mkdir uploads\avatars
    echo ✓ 创建目录: uploads\avatars
) else (
    echo ✓ 目录已存在: uploads\avatars
)

echo.
echo [3/4] 检查后端依赖...
cd backend
python -c "import fastapi, sqlalchemy, pydantic" 2>nul
if %errorlevel% neq 0 (
    echo 警告: 检测到缺少依赖，正在安装...
    pip install -r requirements.txt
) else (
    echo ✓ 后端依赖已满足
)
cd ..

echo.
echo [4/4] 检查前端依赖...
cd frontend
if exist "node_modules" (
    echo ✓ 前端依赖已安装
) else (
    echo 正在安装前端依赖...
    call npm install
)
cd ..

echo.
echo ========================================
echo ✓ 个人中心功能初始化完成！
echo ========================================
echo.
echo 后续步骤:
echo 1. 启动后端服务: cd backend ; python main.py
echo 2. 启动前端服务: cd frontend ; npm run dev
echo 3. 访问系统: http://localhost:5173/profile
echo.
echo 详细使用说明请查看: PROFILE_CENTER_GUIDE.md
echo.
pause

