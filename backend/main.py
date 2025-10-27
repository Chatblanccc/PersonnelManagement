from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from logging.config import dictConfig
from pathlib import Path

from sqlalchemy import text

from app.database import engine, Base, SessionLocal
from app.routers import (
    contracts_router,
    auth_router,
    users_router,
    approvals_router,
    settings_router,
    profile_router,
    announcement_router,
    operations_router,
)


def setup_logging() -> None:
    log_dir = Path("/app/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            },
            "access": {
                "format": "%(asctime)s | %(levelname)s | %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "level": "INFO",
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "filename": str(log_dir / "backend.log"),
                "maxBytes": 5 * 1024 * 1024,
                "backupCount": 5,
                "formatter": "default",
                "level": "INFO",
            },
            "access_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "filename": str(log_dir / "access.log"),
                "maxBytes": 5 * 1024 * 1024,
                "backupCount": 3,
                "formatter": "access",
                "level": "INFO",
            },
        },
        "loggers": {
            "uvicorn": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["console", "access_file"],
                "level": "INFO",
                "propagate": False,
            },
            "app": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
        },
        "root": {
            "handlers": ["console", "file"],
            "level": "INFO",
        },
    }

    dictConfig(logging_config)


setup_logging()
logger = logging.getLogger("app")

# 数据库补丁：确保新增列存在
def ensure_contract_columns() -> None:
    """确保 contracts 表的审批相关字段存在并具备默认值。"""
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)"
        ))
        conn.execute(text(
            "ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS approval_completed_at TIMESTAMPTZ"
        ))
        conn.execute(text(
            "ALTER TABLE IF EXISTS contracts ALTER COLUMN approval_status SET DEFAULT 'pending'"
        ))
        conn.execute(text(
            "UPDATE contracts SET approval_status = 'pending' WHERE approval_status IS NULL"
        ))


# 创建数据库表
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建表
    Base.metadata.create_all(bind=engine)
    ensure_contract_columns()
    
    # 初始化字段配置（容错处理）
    try:
        from app.services.field_config_service import FieldConfigService
        with SessionLocal() as session:
            FieldConfigService.bootstrap_defaults(session)
        logger.info("字段配置初始化完成")
    except Exception as e:
        logger.warning(f"字段配置初始化失败（非致命错误）: {e}")
    
    logger.info("数据库结构初始化完成")
    yield
    # 关闭时的清理工作（如果需要）

app = FastAPI(
    title="教师合同管理系统 API",
    description="智能OCR识别与人事合同管理系统",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    # "http://192.168.110.252:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d{1,5})?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api", tags=["users"])
app.include_router(contracts_router, prefix="/api", tags=["contracts"])
app.include_router(approvals_router, prefix="/api", tags=["approvals"])
app.include_router(settings_router, prefix="/api", tags=["settings"])
app.include_router(profile_router, prefix="/api", tags=["profile"])
app.include_router(announcement_router, prefix="/api", tags=["announcements"])
app.include_router(operations_router, prefix="/api", tags=["operations"])

@app.get("/")
async def root():
    return {
        "message": "教师合同管理系统 API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
