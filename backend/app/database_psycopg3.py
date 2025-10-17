from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 如果使用 psycopg3，数据库 URL 格式为: postgresql+psycopg://...
# 如果使用 psycopg2，数据库 URL 格式为: postgresql://...

database_url = settings.DATABASE_URL

# 自动适配：如果使用 psycopg3，确保 URL 格式正确
if 'psycopg' not in database_url and 'postgresql://' in database_url:
    # 如果安装的是 psycopg3，需要改为 postgresql+psycopg://
    # 但为了兼容性，我们保持原格式，SQLAlchemy 会自动适配
    pass

# 创建数据库引擎
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    echo=True,  # 开发时显示 SQL 语句
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()

# 依赖注入：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

