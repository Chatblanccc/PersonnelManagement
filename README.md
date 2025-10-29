# 教师合同 OCR 识别与管理系统

一个基于 React + FastAPI + PaddleOCR 的智能人事合同管理系统。

## 系统特性

- 📄 **智能 OCR 识别**：自动识别合同中的 40+ 个关键字段
- 🔒 **数据加密存储**：敏感信息（身份证、电话等）AES256 加密
- ✏️ **在线编辑**：支持识别结果的人工修订
- 📊 **数据导出**：支持筛选、搜索、导出 Excel
- 🟡 **置信度联动**：实时可视化字段置信度，低置信度字段高亮提醒
- 🎨 **现代化界面**：基于 TailwindCSS + shadcn/ui + Ant Design 5.0
- 🔐 **权限管理**：JWT 鉴权 + RBAC 角色控制
- 👤 **个人中心**：用户档案管理、密码修改、实时通知消息
- 🔔 **通知系统**：审批提醒、合同到期提醒、系统消息推送

## 技术栈

### 前端
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui
- Ant Design 5.0
- Zustand（状态管理）
- React Query（数据获取）
- Axios

### 后端
- FastAPI (Python 3.11)
- PostgreSQL 15
- SQLAlchemy（ORM）
- PaddleOCR（OCR 引擎）
- Cryptography（数据加密）

## 项目结构

```
PersonnelManagement/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面组件
│   │   ├── hooks/        # 自定义 hooks
│   │   ├── store/        # Zustand store
│   │   ├── api/          # API 接口
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              # 后端项目
│   ├── app/
│   │   ├── models/       # 数据库模型
│   │   ├── routers/      # API 路由
│   │   ├── services/     # 业务逻辑
│   │   ├── ocr/          # OCR 模块
│   │   └── utils/        # 工具函数
│   ├── requirements.txt
│   └── main.py
│
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- **Poppler** (PDF 处理工具，OCR 必需)

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

### 本地启用代理（解决远程 CORS）

1. 编辑 `docker/env/frontend.local.env`，根据需要切换：
   - `VITE_DEV_USE_PROXY=true` 表示启用代理；
   - `VITE_DEV_PROXY_TARGET=http://192.168.110.252:8000` 指向远程服务器；
   - `VITE_DEV_PROXY_ORIGIN=http://localhost:5173` 与本地访问地址一致。
2. 前端代码中的请求基地址保持 `/api`，由 Vite 代理统一转发。
3. 如需临时关闭代理，只需改回 `VITE_DEV_USE_PROXY=false` 并重启开发服务器。

### 后端启动

#### 1. 安装 Poppler（必需）

**Windows 用户：**
```powershell
# 方式 1: 使用 Chocolatey（推荐）
choco install poppler -y

# 方式 2: 运行自动安装脚本
.\setup_poppler.ps1

# 方式 3: 手动下载
# 访问 https://github.com/oschwartz10612/poppler-windows/releases
# 下载并解压到 C:\Program Files\poppler\Library\bin
# 添加到系统环境变量 PATH
```

验证安装：
```powershell
pdfinfo -v  # 应显示版本号
```

**详细安装指南请参考：`INSTALL_POPPLER.md` 或 `QUICK_FIX.md`**

#### 2. 启动后端服务

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 数据库配置

1. 创建 PostgreSQL 数据库：
```sql
CREATE DATABASE personnel_management;
```

2. 配置环境变量（创建 `backend/.env` 文件）：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/personnel_management
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-encryption-key
FILE_ENCRYPTION_KEY=your-file-encryption-key-32-bytes-long
CONTRACT_STORAGE_DIR=./storage/contracts
```

## 测试与验证

### 合同上传端到端检查

1. 启动后端（FastAPI）与前端（Vite），确认 `.env` 中的数据库、加密、存储路径配置已生效。
2. 登录前端后台，进入“合同台账 → 上传合同”页面，上传一份 PDF 或图片合同扫描件。
3. 等待 OCR 完成，确认抽屉中：
   - 低置信度字段以黄色标记显示；
   - 可直接在抽屉内双击字段进行修订，保存后提示成功。
4. 点击“确认保存”后，验证：
   - `contracts` 表新增记录，`file_url` 为加密目录的相对路径，`teaching_years` 已按参加工作/入职日期自动计算；
   - `contract_attachments`（如开启）与 `operation_logs` 表生成对应日志；
   - `storage/contracts` 目录出现加密文件（内容不可直接查看，可通过后端解密接口验证）。
5. 返回合同台账列表，确认低置信度字段高亮、高置信度字段恢复常规展示。
6. 如需回归测试，可在前端删除测试合同记录，并同步清理 `storage/contracts` 目录下对应的加密文件（根据路径中的 UUID 匹配）。


## 系统功能

### 识别字段（40+）

系统支持识别和管理以下字段：

- **基础信息**：员工工号、部门、姓名、职务、性别、年龄、民族、政治面貌、身份证号码、籍贯
- **入职信息**：入职日期、转正日期、合同开始日、合同到期日、在职状态、离职日期
- **联系方式**：电话号码、家庭住址、紧急联系人、联系电话
- **教育背景**：最高学历、毕业院校、毕业证号、毕业时间、专业、学位、学位证号
- **资格证书**：教师资格种类、教师资格证号、职称等级、职称证号、职称取证时间、心理证、普通话等级
- **工作信息**：参加工作时间、教龄、持证类别、任教年级、任教学科、上一份工作经历
- **其他**：备注

## 开发计划

MVP 开发周期：4-6 周

- ✅ Week 1-2：项目初始化、前端基础框架、数据库设计
- 🔄 Week 3-4：OCR 模块开发、API 接口实现
- 📅 Week 5：前后端联调、数据加密实现
- 📅 Week 6：测试、优化、部署

## 安全与合规

- 敏感字段（身份证、电话、地址）采用 AES256 加密
- 文件随机命名，避免路径泄露
- JWT 鉴权，所有接口需要认证
- 操作日志记录（上传/编辑/导出）
- 导出文件带时间戳和水印

## 功能文档

### 个人中心 🆕
完整的个人中心功能已开发完成，包含：
- 👤 基础信息管理（头像、档案、编辑）
- 🔐 安全设置（密码修改、账号管理）
- 🔔 通知消息（实时提醒、已读管理）

**相关文档：**
- [个人中心完整指南](./PROFILE_CENTER_GUIDE.md) - 功能说明、API 文档、部署步骤
- [开发总结](./PROFILE_CENTER_SUMMARY.md) - 技术实现、代码统计、亮点总结
- [快速参考](./PROFILE_CENTER_QUICKREF.md) - API 速查、常用命令、故障排查

**快速初始化：**
```bash
# Windows
init-profile-center.bat

# 或手动执行
psql -U postgres -d personnel_management -f backend/add_profile_features.sql
mkdir -p backend/uploads/avatars
```

## License

MIT

