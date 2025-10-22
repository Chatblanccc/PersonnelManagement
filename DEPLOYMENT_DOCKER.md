# 教师合同 OCR 系统 Docker 部署方案

本指南拆分为两大部分：

- **第 1 部分**：本地 Windows 环境使用 Docker 进行开发、测试与验收。
- **第 2 部分**：校园服务器正式部署与运维（原有内容保留）。

通过先在本地以容器化方式完成联调、抽取配置，再把代码与部署脚本推送到 GitHub，可确保在校园服务器复用同样的 Compose 方案顺利上线。

---

## 第 1 部分：本地 Windows 环境部署

### 1. 前置准备

- **系统要求**：Windows 10/11 专业版或教育版，启用 Hyper-V 或 WSL2。
- **软件安装**：
  - Docker Desktop ≥ 4.30（安装时勾选 Use WSL2）。
  - Git ≥ 2.40。
  - Node.js ≥ 18（用于必要时本地调试/构建）。
  - Python 3.11（可选，用于脚本或单元测试）。
- **硬件建议**：≥ 16 GB 内存、≥ 6 核 CPU；SSD 预留 ≥ 30 GB。
- **Docker Desktop 设置**：在 Settings → Resources 中分配足够资源（CPU 6、Memory 12 GB）；Settings → WSL integration 勾选项目所在的 WSL 发行版；Settings → Shared Drives/Resources 确保共享 `D:` 盘。

### 2. 仓库结构（本地建议）

```
D:\PersonnelManagement
├─ backend\
│  ├─ app\
│  ├─ Dockerfile            # 后端镜像构建文件
│  └─ requirements.txt
├─ frontend\
│  ├─ src\
│  └─ Dockerfile            # 前端镜像构建文件
├─ docker\
│  ├─ env\
│  │  ├─ backend.local.env
│  │  ├─ frontend.local.env
│  │  └─ database.local.env
│  ├─ paddleocr\            # PaddleOCR 模型缓存
│  └─ nginx\                # 可选：Nginx 配置
├─ storage\contracts\      # 合同原件挂载目录（本地测试）
├─ logs\backend\           # 后端日志
├─ logs\nginx\             # Nginx 日志（可选）
├─ docker-compose.local.yml
└─ DEPLOYMENT_DOCKER.md
```

> 建议在 `.gitignore` 中忽略 `storage/`、`logs/`、`docker/env/*.local.env` 等本地文件夹。

### 3. 环境变量文件

在 `docker/env/` 目录创建以下文件（示例值可根据需要调整）：

`docker/env/backend.local.env`

```
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://pm_admin:devpass@database:5432/personnel
JWT_SECRET=local-dev-secret
AES_KEY=本地32字节Base64密钥
FILE_STORAGE_PATH=/data/contracts
OCR_SERVICE_URL=http://paddleocr:9000
SUPABASE_URL=
SUPABASE_KEY=
```

`docker/env/frontend.local.env`

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=教师合同 OCR 管理系统（本地）
```

`docker/env/database.local.env`

```
POSTGRES_DB=personnel
POSTGRES_USER=pm_admin
POSTGRES_PASSWORD=devpass
```

> 注意：`AES_KEY` 必须是 Base64 编码的 32 字节密钥；真实密钥不要提交到 Git。

### 4. Dockerfile 思路（本地与生产共用）

后端与前端的 Dockerfile 设计与后文第 3 部分保持一致，为本地/服务器共用：

- 后端：基于 `python:3.11-slim` 安装依赖、复制源代码、设置 `UVICORN_WORKERS` 等环境变量。
- 前端：Node 构建、Nginx 托管静态文件；可在本地调试时映射到 `http://localhost:3000`。
- PaddleOCR：如需本地单独部署，可在 `docker/paddleocr/` 下编写 Dockerfile 或直接使用官方镜像。
- PostgreSQL：沿用 `postgres:15-alpine`；本地使用卷 `pm_pgdata_local` 持久化数据。

### 5. docker-compose.local.yml 示例

```yaml
version: "3.9"

name: pm-local

services:
  database:
    image: postgres:15-alpine
    container_name: pm_local_postgres
    env_file: docker/env/database.local.env
    ports:
      - "5432:5432"
    volumes:
      - pm_pgdata_local:/var/lib/postgresql/data
    restart: unless-stopped

  paddleocr:
    build:
      context: ./docker/paddleocr
      dockerfile: Dockerfile
    container_name: pm_local_paddleocr
    volumes:
      - ./docker/paddleocr:/app/models
    env_file:
      - docker/env/backend.local.env
    environment:
      - OCR_PORT=9000
    ports:
      - "9000:9000"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pm_local_backend
    env_file: docker/env/backend.local.env
    depends_on:
      - database
      - paddleocr
    volumes:
      - ./storage/contracts:/data/contracts
      - ./logs/backend:/app/logs
    ports:
      - "8000:8000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pm_local_frontend
    env_file: docker/env/frontend.local.env
    depends_on:
      - backend
    ports:
      - "3000:80"
    restart: unless-stopped

volumes:
  pm_pgdata_local:
```

> 如果本地仅需联调前后端，不需要独立 PaddleOCR 服务，可暂时移除 `paddleocr` 服务，并在 `backend.local.env` 中将 `OCR_SERVICE_URL` 留空，此时后端默认使用内置 PaddleOCR 访问本地模型。需要单独 OCR 服务时，再恢复该容器并调整配置。

### 6. 本地部署步骤

1. **克隆仓库**：`git clone` 到 `D:\PersonnelManagement`。
2. **准备目录**：创建 `storage\contracts`, `logs\backend`, `logs\nginx` 等。
3. **配置环境变量**：按上述示例填写 `docker/env/*.local.env`。
4. **构建镜像**：`docker compose -f docker-compose.local.yml build`。
5. **数据库迁移**：`docker compose -f docker-compose.local.yml run --rm backend alembic upgrade head`。
6. **启动服务**：`docker compose -f docker-compose.local.yml up -d`。
7. **验证**：访问 `http://localhost:3000`（前端）和 `http://localhost:8000/docs`（API 文档）。
8. **查看日志**：`docker compose -f docker-compose.local.yml logs -f backend`。
9. **停止并清理**：`docker compose -f docker-compose.local.yml down`（如需清空数据再加 `-v`）。

### 7. 本地部署注意事项

- **Windows 路径**：谨慎处理大小写与 `\`/`/`；Compose 文件中路径建议使用 `/`（Docker 会自动映射）。
- **权限问题**：首次挂载目录可能出现权限不足，可使用管理员 PowerShell 创建目录并授权当前用户。
- **网络代理**：若校园网络限制外网访问，可在 Docker Desktop 中配置镜像加速器或使用校园私有 registry。
- **调试**：本地调试时可通过 `docker exec -it pm_local_backend /bin/bash` 进入容器，观察日志、手动执行命令。
- **热更新**：如需在本地进行代码热更新，可将后端 `volumes` 映射源码目录并在 Dockerfile 中开启 `watchfiles` 模式；但需在开发阶段使用，生产构建仍采用复制源码。

---

## 第 2 部分：校园服务器 Docker 部署方案

## 2. 仓库结构与配置文件

假设项目位于 `/opt/personnel-management`：

```
/opt/personnel-management
├─ backend/
│  ├─ app/
│  └─ Dockerfile          # 后端镜像构建文件
├─ frontend/
│  └─ Dockerfile          # 前端镜像构建文件
├─ docker/
│  ├─ nginx.conf          # Nginx 反向代理配置（可选）
│  ├─ paddle_ocr_models/  # PaddleOCR 模型缓存（可挂载）
│  └─ env/
│     ├─ backend.env
│     ├─ frontend.env
│     └─ database.env
├─ docker-compose.yml
└─ DEPLOYMENT_DOCKER.md   # 本文档
```

环境变量说明（示例）：

- `docker/env/backend.env`
  - `APP_ENV=production`
  - `DATABASE_URL=postgresql+asyncpg://user:pass@database:5432/personnel`
  - `JWT_SECRET=...`
  - `OCR_SERVICE_URL=http://paddleocr:9000`
  - `FILE_STORAGE_PATH=/data/contracts`
- `docker/env/frontend.env`
  - `VITE_API_BASE_URL=https://pm.example.edu/api`
  - `VITE_APP_TITLE=教师合同 OCR 管理系统`
- `docker/env/database.env`
  - `POSTGRES_DB=personnel`
  - `POSTGRES_USER=personnel_admin`
  - `POSTGRES_PASSWORD=安全密码`

> 注意：所有密码、密钥应通过校园密码管理平台或手动生成，严禁使用弱口令。

## 3. Dockerfile 设计建议

### 3.1 前端（Vite + React）

使用多阶段构建：

1. `node:20-alpine` 构建阶段，安装依赖并执行 `npm run build`。
2. `nginx:1.27-alpine` 运行阶段，拷贝 `dist/` 到 `/usr/share/nginx/html`。
3. 覆盖 `nginx.conf`，将所有前端路由指向 `index.html`。

### 3.2 后端（FastAPI + Uvicorn + PaddleOCR 客户端）

- 基础镜像：`python:3.11-slim`。
- 安装依赖：`pip install -r requirements.txt`。
- 运行命令：`uvicorn app.main:app --host 0.0.0.0 --port 8000`。
- 确保安装 `libpq-dev`、`build-essential` 等编译依赖。
- 将 `alembic` 或数据库迁移脚本包含在镜像中，容器启动时执行迁移。

### 3.3 PaddleOCR 服务

- 基础镜像：`paddlepaddle/paddle:2.6.1`。
- 安装 `paddleocr`、`paddlepaddle`、中文模型。
- 暴露 HTTP 服务（可使用社区现成服务如 `paddleocr-service`，或自行编写 FastAPI 包装）。
- 挂载模型目录以避免重复下载：`/opt/paddle_models`。

### 3.4 数据库（PostgreSQL 15）

- 使用官方镜像 `postgres:15-alpine`。
- 自定义 `postgresql.conf` 和 `pg_hba.conf`（可选）。
- 挂载数据卷 `/var/lib/postgresql/data`（建议使用主机路径或独立数据盘）。

### 3.5 Nginx 反向代理（可选）

- 负责前端静态资源和后端 API 的统一出口。
- 支持 HTTPS（自签名或校内 CA 证书）。
- 可启用 HTTP/2、gzip、缓存、限流等增强功能。

## 4. docker-compose.yml 示例

```yaml
version: "3.9"

networks:
  pm_net:
    driver: bridge

services:
  database:
    image: postgres:15-alpine
    container_name: pm_postgres
    env_file: docker/env/database.env
    volumes:
      - pm_pgdata:/var/lib/postgresql/data
    networks:
      - pm_net
    restart: unless-stopped

  paddleocr:
    build:
      context: ./docker/paddleocr
    container_name: pm_paddleocr
    volumes:
      - ./docker/paddle_ocr_models:/app/models
    environment:
      - OCR_PORT=9000
    ports:
      - "9000:9000"  # 如需内网调试
    networks:
      - pm_net
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pm_backend
    env_file: docker/env/backend.env
    depends_on:
      - database
      - paddleocr
    volumes:
      - ./storage/contracts:/data/contracts
      - ./logs/backend:/app/logs
    networks:
      - pm_net
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pm_frontend
    env_file: docker/env/frontend.env
    depends_on:
      - backend
    networks:
      - pm_net
    restart: unless-stopped

  nginx:
    image: nginx:1.27-alpine
    container_name: pm_nginx
    depends_on:
      - frontend
      - backend
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./logs/nginx:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"  # 若配置了 HTTPS
    networks:
      - pm_net
    restart: unless-stopped

volumes:
  pm_pgdata:
```

> 注：若校园内仅需 HTTP，可暂时关闭 443 并根据实际网络安全策略调整端口映射。

## 5. 部署步骤

1. **安装 Docker 及 Compose**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   sudo apt-get install -y docker-compose-plugin
   ```
2. **克隆代码并切换到部署目录**
   ```bash
   git clone git@your.git.server:personnel/PersonnelManagement.git /opt/personnel-management
   cd /opt/personnel-management
   ```
3. **准备配置与密钥**
   - 复制 `.env.example` 到 `docker/env/*.env`。
   - 根据校园环境填写数据库、JWT、存储路径等信息。
   - 将 SSL 证书（若有）放入 `docker/certs/`。
4. **导入 OCR 模型（可选）**
   - 将 `ch_ppocr_server_v2.0` 等模型目录放入 `docker/paddle_ocr_models/`，避免容器启动时下载失败。
5. **构建镜像**
   ```bash
   docker compose build
   ```
6. **执行数据库迁移**（首次部署）
   ```bash
   docker compose run --rm backend alembic upgrade head
   ```
7. **启动服务**
   ```bash
   docker compose up -d
   ```
8. **验证部署**
   - 访问 `http://<服务器IP>` 查看前端是否正常。
   - 使用管理账号登录，检查合同上传、OCR、审批流程、公告等功能。
   - 查看日志是否存在错误：`docker compose logs -f backend`。

## 6. 维护与运维流程

- **日志收集**：前后端、Nginx 日志统一挂载到 `/opt/personnel-management/logs/`，可对接校园 ELK。
- **备份策略**
  - PostgreSQL：使用 `pg_dump` + 定时任务，备份至校园 NAS。
  - 合同文件：同步 `storage/contracts/` 到安全文件服务器。
  - 配置文件：定期备份 `docker/env/`。
- **升级流程**
  1. `git pull` 获取最新代码。
  2. `docker compose build --no-cache backend frontend`。
  3. 如有数据库结构变化，执行 `alembic upgrade head`。
  4. `docker compose up -d backend frontend`。
- **回滚策略**
  - 保留上一版本镜像（可通过 `docker image tag` 备份）。
  - 使用 `docker compose down` + `docker compose up` 重新指向旧镜像。

## 7. 安全与合规建议

- **网络隔离**：
  - 将数据库、PaddleOCR 服务仅暴露在内部网络。
  - 使用校园统一身份认证（若需）在反向代理层做 SSO。
- **数据加密**：
  - 在后端确保身份证、手机号使用 AES256 加密存储。
  - 数据库连接启用 SSL（若校园内部 PKI 支持）。
- **审计**：
  - 配置操作日志输出到独立日志系统。
  - 定期导出审批日志给校方审计部门。
- **高可用**（可选）：
  - 利用双机热备或 k3s 集群部署。
  - 数据库使用主从复制。

## 8. 常见问题与排查

| 问题 | 排查步骤 |
| ---- | -------- |
| 容器启动失败 | `docker compose logs <service>` 查看错误信息，检查环境变量和依赖服务；确保端口未被占用。 |
| OCR 超时 | 确认 `paddleocr` 容器 CPU/GPU 分配是否充足；检查模型是否加载成功；可开启 GPU 版本（需配合 NVIDIA Docker）。 |
| 前端 502 | 检查 `nginx` 到 `backend`、`frontend` 的 upstream 配置；确认容器在运行。 |
| 数据库连接失败 | 验证 `DATABASE_URL` 是否正确；确认 `database` 容器状态；检查防火墙规则。 |
| 文件无法上传 | 确认 `storage/contracts` 目录的读写权限；检查挂载路径是否存在。 |

## 9. 后续扩展

- **CI/CD**：可在校园 GitLab/Jenkins 上配置流水线，自动构建并推送镜像。
- **监控告警**：部署 Prometheus + Grafana，对 CPU、内存、接口响应时间进行监控；结合 Alertmanager 推送告警。
- **备份审计自动化**：结合校园自动化平台，每日定时备份数据库、文件，并生成审计报告。

---

完成以上步骤后，即可在校园内网环境中稳定运行教师合同 OCR 系统。若后续需要生成对应的 `Dockerfile`、`docker-compose.yml` 或自动化脚本，请告知具体要求。祝部署顺利！

