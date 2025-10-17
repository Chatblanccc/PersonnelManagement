from __future__ import annotations

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    order_index = Column(Integer, nullable=False, default=1)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assistants = Column(JSON, default=list)  # 协助人列表，存储用户ID列表
    sla_days = Column(Integer)
    sla_text = Column(String(100))
    checklist = Column(JSON, default=list)
    reminders = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", lazy="joined")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WorkflowStage(key={self.key}, name={self.name})>"
