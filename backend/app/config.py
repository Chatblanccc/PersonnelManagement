from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str = "postgresql://postgres:1997yx0912@localhost:5432/personnel_management"
    
    # JWT 配置
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 加密配置
    ENCRYPTION_KEY: str = "your-encryption-key-32-bytes-lo"
    
    # 文件上传配置
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    
    # OCR 配置
    OCR_ENABLED: bool = False
    OCR_CONFIDENCE_THRESHOLD: float = 0.8
    OCR_USE_GPU: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

