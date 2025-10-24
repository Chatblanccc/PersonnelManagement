# 校园服务器部署方案

本文档说明如何将“教师合同 OCR 识别与管理系统”部署到校园内网服务器，适用于已经在本地通过 Docker 验证过的环境。

## 1. 部署目标与整体流程

- 通过 Git 在校园服务器上同步最新代码。
- 使用 Docker Compose 启动 PostgreSQL、FastAPI、OCR 服务和前端应用。
- 确保上传的合同文件与后端日志在宿主机持久化保存。
- 提供内网访问入口，无需暴露公网。

## 2. 前置条件

- 服务器处于校园内网，客户端可直接访问其 IP。
- 已安装并配置：
  - Git（建议 ≥ 2.30）
  - Docker Engine（建议 ≥ 24.x）
  - Docker Compose Plugin（`docker compose version` 可用）
- 具备拉取私有仓库的权限（若仓库为私有）。
- 服务器磁盘空间 ≥ 20 GB，保证有足够空间缓存 PaddleOCR 模型和合同原件。
- 清楚项目使用的数据库、JWT 密钥等敏感配置，并具备安全传输这些配置的方案（切勿直接提交到 Git）。

## 3. 目录与权限准备

在服务器上为挂载卷预留目录，并赋予 Docker 读写权限：

```powershell
# Windows PowerShell 示例
New-Item -ItemType Directory D:\PersonnelManagement\storage\contracts -Force
New-Item -ItemType Directory D:\PersonnelManagement\logs\backend -Force

# Linux Bash 示例
sudo mkdir -p /data/personnel-management/storage/contracts
sudo mkdir -p /data/personnel-management/logs/backend
sudo chown -R $USER:$USER /data/personnel-management
```

部署时需将 `docker-compose.local.yml` 中的卷路径与服务器实际路径保持一致。如需调整，可在项目根目录下新建专用配置文件（例如 `docker-compose.campus.yml`）并覆盖对应 `volumes` 映射。

## 4. 环境变量配置

项目使用 `.env` 文件管理敏感参数，默认放在 `docker/env/` 目录：

- `backend.local.env`：数据库连接、JWT 密钥、PaddleOCR 相关设置。
- `database.local.env`：PostgreSQL 管理员账号、密码等。
- `frontend.local.env`：前端 API 地址等配置。

**务必不要将实际凭据提交到 Git。** 推荐做法：

1. 在本地或安全渠道准备好对应 `.env` 文件。
2. 通过 SCP、SMB、加密 U 盘等方式传到校园服务器的 `docker/env/` 目录。
3. 确保文件编码为 UTF-8，行尾为 LF。

额外说明：

- `DATABASE_URL` 中的主机名需能在校园网络中解析；若数据库在同一台服务器，可使用 `host.docker.internal`（Windows）或容器服务名，如 `postgres`。
- 如果 JWT 密钥未配置，将影响登录、授权；上线前需填好强度足够的随机字符串。
- 若需替换 PaddleOCR 模型下载地址，可通过环境变量或在镜像中预置模型。

## 5. 拉取代码

```powershell
# 首次部署
cd D:\
git clone https://github.com/<your-org>/PersonnelManagement.git
cd PersonnelManagement

# 后续更新
git pull origin main  # 或指定分支
```

若仓库包含子模块，请记得同步：`git submodule update --init --recursive`。

## 6. 构建并启动容器

进入项目根目录，执行：

```powershell
docker compose -f docker-compose.local.yml pull              # 可选：提前拉取基础镜像
docker compose -f docker-compose.local.yml build --no-cache   # 首次建议不使用缓存
docker compose -f docker-compose.local.yml up -d
```

注意事项：

- 首次启动时，PaddleOCR 会下载模型文件，体积较大，需耐心等待日志下载完成。
- `backend` 服务启动时会自动创建/迁移数据库表，包括 `operation_logs`、`contract_logs` 等；如已有旧数据，建议在部署前先备份数据库。
- 如果本地和校园服务器的 compose 文件有所不同，可使用自定义文件，例如：

  ```powershell
  docker compose -f docker-compose.campus.yml up -d --build
  ```

## 7. 服务验证

1. 查看容器状态：

   ```powershell
   docker compose -f docker-compose.local.yml ps
   ```

2. 观察后端日志，确认无异常报错且出现 `数据库结构初始化完成`、`Uvicorn running on http://0.0.0.0:8000` 等信息：

   ```powershell
   docker compose -f docker-compose.local.yml logs -f backend
   ```

3. 在内网任意电脑的浏览器访问：
   - 前端：`http://<服务器IP>:3000`
   - 后端 Swagger：`http://<服务器IP>:8000/docs`

4. 验证合同上传、OCR、字段保存、操作日志查看等核心功能，确保配置正确。

## 8. 日常维护与更新

- **代码更新**：
  ```powershell
  git pull
  docker compose -f docker-compose.local.yml up -d --build
  ```
  仅修改 Python/TypeScript 源码时，可省略 `--no-cache`；如调整依赖或 Dockerfile，建议加上。

- **查看操作日志**：`logs/backend/backend.log`、`logs/backend/access.log` 记录了业务操作与请求信息，可定期备份或归档。

- **数据库备份**：
  ```powershell
  docker compose -f docker-compose.local.yml exec postgres pg_dump -U <db_user> personnel_db > backup.sql
  ```
  根据校园服务器实际数据库名称和账号调整。

- **合同文件备份**：定期将 `storage/contracts` 目录复制到安全存储介质，确保加密传输与访问控制。

- **重启服务**：
  ```powershell
  docker compose -f docker-compose.local.yml restart backend frontend
  ```

## 9. 常见问题排查

| 症状 | 可能原因 | 处理办法 |
| --- | --- | --- |
| `backend` 容器反复重启，日志提示缺少依赖 | 重新构建镜像时未安装新依赖 | 执行 `docker compose ... build backend --no-cache` 后重启 |
| 前端访问接口报 401 | JWT 密钥与数据库中旧 token 不匹配 | 清理旧 token 或更新前端配置；确保 `.env` 中 `JWT_SECRET_KEY` 一致 |
| 上传合同后报错 | `storage/contracts` 无写权限 | 检查宿主机目录权限，确保 Docker 进程可读写 |
| OCR 模型下载失败 | 服务器无法访问外网 | 提前在本地下载模型并挂载到镜像，或配置离线模型路径 |
| 访问日志为空 | 未触发接口或日志级别过高 | 确认 `backend/main.py` 中的日志配置，必要时调整日志级别 |

## 10. 安全注意事项

- 将登录账号、数据库凭据等敏感信息保存在安全位置，可使用学校统一的密码管理方案。
- 建议限制校园服务器上 Docker 管理权限，仅授权给运维人员。
- 如需审计，操作日志表 `operation_logs` 已记录用户、动作、IP、设备信息，可结合数据库查询进行统计。
- 若后续需要 HTTPS 或统一入口，可加部署一层 Nginx/Traefik 作为反向代理，同时保留内网访问。

---

按上述步骤执行即可在校园内网稳定运行本系统。如遇本文未覆盖的问题，可先查阅 `DEPLOYMENT_DOCKER.md`、项目 README 或系统日志，再向开发团队反馈。祝部署顺利！

