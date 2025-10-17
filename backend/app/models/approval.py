from __future__ import annotations

import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ApprovalTask(Base):
    __tablename__ = "approval_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)
    teacher_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    stage = Column(String(30), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="pending", index=True)
    priority = Column(String(20), nullable=False, default="medium")
    owner = Column(String(100), nullable=False)
    assignees = Column(JSON, nullable=False, default=list)
    due_date = Column(Date, nullable=False)
    remarks = Column(Text)
    latest_action = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    check_items = relationship(
        "ApprovalCheckItem",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="joined",
        order_by="ApprovalCheckItem.order",
    )
    histories = relationship(
        "ApprovalHistory",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ApprovalHistory.created_at.desc()",
    )


class ApprovalCheckItem(Base):
    __tablename__ = "approval_check_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("approval_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(150), nullable=False)
    completed = Column(Boolean, default=False)
    order = Column(Integer, nullable=False, default=0)

    task = relationship("ApprovalTask", back_populates="check_items")


class ApprovalHistory(Base):
    __tablename__ = "approval_histories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("approval_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(80), nullable=False)
    operator = Column(String(100), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("ApprovalTask", back_populates="histories")


