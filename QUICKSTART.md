# 快速开始指南

本指南帮助您在 5 分钟内启动教师合同管理系统。

## 前置要求

确保已安装以下软件：

- ✅ Node.js 18+ 
- ✅ Python 3.11+
- ✅ PostgreSQL 15+

## 步骤 1：克隆项目

```bash
git clone <repository-url>
cd PersonnelManagement
```

## 步骤 2：配置数据库

### 创建数据库

```bash
# 方式 1：使用 psql
psql -U postgres
CREATE DATABASE personnel_management;
\q

# 方式 2：使用 pgAdmin（图形界面）
# 打开 pgAdmin，右键 Databases -> Create -> Database
# 数据库名：personnel_management
```

### 配置连接信息

创建 `backend/.env` 文件：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，修改数据库连接信息：

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/personnel_management
```

## 步骤 3：自动启动（推荐）

### Windows 用户

双击运行 `start-dev.bat`

或在命令行执行：
```bash
start-dev.bat
```

### Linux/Mac 用户

```bash
chmod +x start-dev.sh
./start-dev.sh
```

脚本会自动：
1. 检查 PostgreSQL 服务
2. 创建 Python 虚拟环境并安装依赖
3. 启动后端 API 服务
4. 安装前端依赖
5. 启动前端开发服务器

## 步骤 4：手动启动（可选）

如果自动启动脚本失败，可以手动启动：

### 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 启动前端

打开新的终端窗口：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 步骤 5：访问系统

打开浏览器访问：

- **前端系统**: http://localhost:5173
- **API 接口**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 测试 OCR 功能

1. 访问前端系统 http://localhost:5173
2. 进入「合同管理」页面
3. 拖拽或点击上传区域，上传一份教师合同（PDF 或图片）
4. 系统会自动进行 OCR 识别
5. 识别完成后会弹出结果预览窗口
6. 确认无误后点击「保存」

## 常见问题

### Q1: PostgreSQL 连接失败

**症状**: `connection refused` 或 `could not connect to server`

**解决方案**:
1. 确认 PostgreSQL 服务已启动
   ```bash
   # Windows
   # 在服务管理器中启动 PostgreSQL 服务
   
   # Linux
   sudo systemctl start postgresql
   
   # Mac
   brew services start postgresql
   ```

2. 检查 `.env` 文件中的连接信息是否正确

### Q2: 端口占用

**症状**: `Address already in use` 或 `Port 8000/5173 is already in use`

**解决方案**:

**Windows:**
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000
# 杀死进程（PID 为上一步查到的进程 ID）
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# 查找并杀死占用端口的进程
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Q3: PaddleOCR 安装失败

**症状**: `ERROR: Could not build wheels for paddlepaddle`

**解决方案**:

1. **Windows 用户**：
   ```bash
   # 安装 Visual C++ Build Tools
   # https://visualstudio.microsoft.com/visual-cpp-build-tools/
   ```

2. **使用国内镜像源**：
   ```bash
   pip install paddlepaddle -i https://pypi.tuna.tsinghua.edu.cn/simple
   pip install paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

3. **降低版本**：
   ```bash
   pip install paddlepaddle==2.5.2
   pip install paddleocr==2.7.0
   ```

### Q4: 前端依赖安装慢

**解决方案**: 使用国内镜像

```bash
# 使用淘宝镜像
npm install --registry=https://registry.npmmirror.com

# 或者使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### Q5: OCR 识别速度慢

这是正常的，首次运行会下载 OCR 模型（约 100MB），之后会快很多。

**加速方案**:
1. 使用 GPU 加速（需要安装 `paddlepaddle-gpu`）
2. 预先下载模型到本地
3. 异步处理 OCR 任务

## 下一步

- 📖 阅读 [完整文档](README.md)
- 🚀 查看 [部署指南](DEPLOYMENT.md)
- 📡 浏览 [API 文档](API.md)
- 🛠️ 自定义字段映射和识别规则

## 需要帮助？

- 提交 Issue
- 查看项目 Wiki
- 联系技术支持

---

祝您使用愉快！ 🎉

