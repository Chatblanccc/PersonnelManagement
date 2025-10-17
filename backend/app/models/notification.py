"""通知消息模型"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class NotificationType(str, enum.Enum):
    """通知类型"""
    APPROVAL_PENDING = "approval_pending"  # 待审批
    APPROVAL_APPROVED = "approval_approved"  # 审批通过
    APPROVAL_REJECTED = "approval_rejected"  # 审批驳回
    CONTRACT_EXPIRING = "contract_expiring"  # 合同即将到期
    SYSTEM = "system"  # 系统通知
    INFO = "info"  # 一般信息


class Notification(Base):
    """通知消息表"""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False, default=NotificationType.INFO.value)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    link_url = Column(String(255))  # 跳转链接
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True))
    
    # 关联数据（可选）
    related_contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="SET NULL"))
    related_approval_id = Column(String(36), ForeignKey("approval_tasks.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # 关系
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, user_id={self.user_id}, title={self.title})>"

