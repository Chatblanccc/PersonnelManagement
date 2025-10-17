# Windows 安装指南

## 当前问题
`psycopg2-binary` 在 Windows 上安装失败，需要编译但缺少 PostgreSQL 开发工具。

## 快速解决方案（3选1）

### ✅ 方案 1：使用 psycopg3（推荐，最简单）

```powershell
# 1. 安装依赖（使用阿里云镜像）
pip install -r requirements-simple.txt -i https://mirrors.aliyun.com/pypi/simple/

# 2. 修改 main.py，暂时不使用 OCR
# 将 main.py 中的 from app.routers import contracts 
# 改为 from app.routers import contracts_no_ocr as contracts

# 3. 启动后端
uvicorn main:app --reload
```

### 方案 2：最小安装（跳过OCR）

```powershell
# 安装核心功能（不包含 OCR）
pip install -r requirements-windows.txt -i https://mirrors.aliyun.com/pypi/simple/
```

### 方案 3：手动安装依赖

```powershell
# 1. 更新 pip
python -m pip install --upgrade pip

# 2. 安装核心依赖
pip install fastapi uvicorn[standard] python-multipart -i https://mirrors.aliyun.com/pypi/simple/

# 3. 安装数据库驱动（psycopg3）
pip install "psycopg[binary]" sqlalchemy pydantic pydantic-settings -i https://mirrors.aliyun.com/pypi/simple/

# 4. 安装其他工具
pip install python-dotenv cryptography python-jose[cryptography] passlib[bcrypt] -i https://mirrors.aliyun.com/pypi/simple/

# 5. 安装 Excel 支持
pip install openpyxl xlsxwriter python-dateutil Pillow alembic regex -i https://mirrors.aliyun.com/pypi/simple/
```

## 启动系统（不使用 OCR）

### 1. 修改 main.py

在 `backend/main.py` 中找到这一行：
```python
from app.routers import contracts
```

改为：
```python
from app.routers import contracts_no_ocr as contracts
```

### 2. 启动后端

```powershell
cd backend
uvicorn main:app --reload
```

### 3. 访问 API 文档

打开浏览器访问: http://localhost:8000/docs

## 稍后安装 OCR（可选）

等系统正常运行后，可以单独安装 OCR 功能：

```powershell
# 安装 PaddleOCR（可能需要 10-15 分钟）
pip install paddlepaddle==2.6.0 -i https://mirrors.aliyun.com/pypi/simple/
pip install paddleocr==2.7.3 -i https://mirrors.aliyun.com/pypi/simple/
pip install pdf2image -i https://mirrors.aliyun.com/pypi/simple/

# 然后将 main.py 改回原来的 import
```

## 前端启动

前端不受影响，正常安装和启动：

```powershell
cd frontend
npm install
npm run dev
```

## 测试系统

1. 访问前端: http://localhost:5173
2. 访问 API: http://localhost:8000
3. 访问 API 文档: http://localhost:8000/docs

注意：上传合同文件功能暂时不能自动识别，需要手动填写字段。

## 恢复 OCR 功能

当安装好 PaddleOCR 后：

1. 将 `backend/main.py` 中的 import 改回：
   ```python
   from app.routers import contracts
   ```

2. 重启后端服务

3. OCR 功能即可使用

