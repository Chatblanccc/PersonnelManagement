"""操作日志模型"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    module = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    summary = Column(String(255), nullable=False)
    detail = Column(Text)

    operator_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    operator_username = Column(String(50))
    operator_name = Column(String(100))

    target_type = Column(String(50))
    target_id = Column(String(100))
    target_name = Column(String(100))

    ip_address = Column(String(45))
    user_agent = Column(String(255))
    request_method = Column(String(10))
    request_path = Column(String(255))
    query_params = Column(Text)

    extra = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    operator = relationship("User", backref="operation_logs", lazy="joined")

    def __repr__(self) -> str:
        return f"<OperationLog(module={self.module}, action={self.action}, operator={self.operator_username})>"


