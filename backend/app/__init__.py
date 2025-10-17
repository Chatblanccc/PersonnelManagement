# App package initialization

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    announcement_router,
    approvals_router,
    auth_router,
    contracts_router,
    profile_router,
    settings_router,
    users_router,
)

app = FastAPI(title="教师合同 OCR 识别与管理系统")

app.include_router(auth_router, prefix="/api")
app.include_router(contracts_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(approvals_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(announcement_router, prefix="/api")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d{1,5})?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

__all__ = ["app"]

