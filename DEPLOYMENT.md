# 部署指南

本文档描述如何部署教师合同 OCR 识别与管理系统。

## 环境要求

### 软件环境
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Git

### 硬件要求
- CPU: 2核以上
- 内存: 4GB 以上（推荐 8GB）
- 磁盘: 20GB 以上

## 一、数据库准备

### 1. 安装 PostgreSQL

**Windows:**
```bash
# 下载并安装 PostgreSQL 15
# https://www.postgresql.org/download/windows/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql-15 postgresql-contrib
```

### 2. 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行
CREATE DATABASE personnel_management;
CREATE USER pm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE personnel_management TO pm_user;
\q
```

## 二、后端部署

### 1. 安装 Python 环境

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
```

### 2. 配置环境变量

创建 `backend/.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://pm_user:your_password@localhost:5432/personnel_management

# JWT 密钥（使用以下命令生成）
# openssl rand -hex 32
SECRET_KEY=your-secret-key-here

# 加密密钥（32字节）
ENCRYPTION_KEY=your-encryption-key-32-bytes-lo

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760

# OCR 配置
OCR_CONFIDENCE_THRESHOLD=0.8
OCR_USE_GPU=false
```

### 3. 初始化数据库

数据库表会在首次启动时自动创建。

### 4. 启动后端服务

**开发环境:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**生产环境:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. 使用 Systemd 部署（Linux 推荐）

创建 `/etc/systemd/system/personnel-api.service`:

```ini
[Unit]
Description=Personnel Management API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/PersonnelManagement/backend
Environment="PATH=/path/to/PersonnelManagement/backend/venv/bin"
ExecStart=/path/to/PersonnelManagement/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable personnel-api
sudo systemctl start personnel-api
sudo systemctl status personnel-api
```

## 三、前端部署

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置环境变量

创建 `frontend/.env` 文件：

```env
VITE_API_BASE_URL=http://your-api-domain.com
```

### 3. 构建生产版本

```bash
npm run build
```

构建产物在 `frontend/dist` 目录。

### 4. 使用 Nginx 部署

安装 Nginx：
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

配置 Nginx (`/etc/nginx/sites-available/personnel-management`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/PersonnelManagement/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件大小限制
    client_max_body_size 10M;
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/personnel-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 四、HTTPS 配置（可选但推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 五、性能优化

### 1. 数据库优化

编辑 PostgreSQL 配置 (`/etc/postgresql/15/main/postgresql.conf`):

```ini
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
work_mem = 4MB
```

### 2. 使用 Redis 缓存（可选）

```bash
# 安装 Redis
sudo apt install redis-server

# 配置后端使用 Redis 缓存
pip install redis
```

### 3. CDN 加速（可选）

将前端静态资源部署到 CDN 以提升访问速度。

## 六、监控与日志

### 1. 应用日志

后端日志位置：
- 标准输出（使用 systemd 时）: `journalctl -u personnel-api -f`
- 自定义日志文件: `backend/logs/app.log`

Nginx 日志：
- 访问日志: `/var/log/nginx/access.log`
- 错误日志: `/var/log/nginx/error.log`

### 2. 性能监控

推荐使用以下工具：
- Prometheus + Grafana
- Sentry（错误追踪）
- New Relic / DataDog

## 七、备份策略

### 1. 数据库备份

创建备份脚本 `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U pm_user personnel_management > "$BACKUP_DIR/db_backup_$DATE.sql"

# 保留最近 7 天的备份
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

添加到 crontab：
```bash
0 2 * * * /path/to/backup.sh
```

### 2. 文件备份

备份上传的合同文件：
```bash
rsync -av /path/to/backend/uploads/ /path/to/backup/uploads/
```

## 八、常见问题

### Q1: OCR 识别速度慢

A: 考虑以下优化：
- 启用 GPU 加速（需要安装 paddlepaddle-gpu）
- 使用更快的 OCR 模型
- 异步处理 OCR 任务（使用 Celery + Redis）

### Q2: 数据库连接池耗尽

A: 增加连接池大小：
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=40
)
```

### Q3: 上传文件失败

A: 检查：
- 文件大小限制
- 磁盘空间
- 目录权限

## 九、安全建议

1. **定期更新依赖**：
   ```bash
   npm audit fix
   pip list --outdated
   ```

2. **启用防火墙**：
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

3. **数据库安全**：
   - 使用强密码
   - 限制远程访问
   - 定期备份

4. **文件权限**：
   ```bash
   chmod 600 backend/.env
   chmod 700 backend/uploads
   ```

## 十、更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 更新后端
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart personnel-api

# 3. 更新前端
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

如有问题，请参考项目 README 或提交 Issue。

