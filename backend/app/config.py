from pathlib import Path
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
    FILE_ENCRYPTION_KEY: str = "your-file-encryption-key-32-bytes-long"
    
    # 文件上传配置
    UPLOAD_DIR: str = "./uploads"
    CONTRACT_STORAGE_DIR: Path = Path("./storage/contracts")
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    
    # OCR 配置
    OCR_ENABLED: bool = False
    OCR_CONFIDENCE_THRESHOLD: float = 0.8
    OCR_USE_GPU: bool = False
    POPPLER_PATH: Optional[str] = None  # Poppler 可执行文件路径（可选）
    OCR_MODEL_DIR: Optional[str] = None  # PaddleOCR 模型存储目录（可选，默认 ~/.paddleocr/）
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # 允许从环境变量读取配置（Docker 中通过 env_file 注入）
        # pydantic_settings 会自动从环境变量读取，优先级高于默认值

settings = Settings()

