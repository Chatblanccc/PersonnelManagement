"""校园公告模型"""
from __future__ import annotations

import uuid

from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    summary = Column(Text)
    region = Column(String(50))
    campus_code = Column(String(50))
    schedule = Column(String(100))
    content = Column(Text)
    cover_url = Column(String(255))
    is_top = Column(Boolean, default=False)
    created_by = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover - repr for debugging
        return f"<Announcement(id={self.id}, title={self.title})>"


