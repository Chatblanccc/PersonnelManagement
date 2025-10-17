from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SimpleUserSummary(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ReminderConfig(BaseModel):
    label: str
    offset_days: int
    channels: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class WorkflowStageBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    order_index: int
    owner_id: Optional[str] = None
    assistants: List[str] = Field(default_factory=list)  # 协助人用户ID列表
    sla_days: Optional[int] = None
    sla_text: Optional[str] = None
    checklist: List[str] = Field(default_factory=list)
    reminders: List[ReminderConfig] = Field(default_factory=list)
    is_active: bool = True


class WorkflowStageRead(WorkflowStageBase):
    id: str
    owner: Optional[SimpleUserSummary] = None

    class Config:
        from_attributes = True


class WorkflowConfigResponse(BaseModel):
    stages: List[WorkflowStageRead] = Field(default_factory=list)
    available_users: List[SimpleUserSummary] = Field(default_factory=list)


class WorkflowStageUpdate(BaseModel):
    key: str
    owner_id: Optional[str] = None
    assistants: Optional[List[str]] = None  # 协助人用户ID列表
    sla_days: Optional[int] = None
    sla_text: Optional[str] = None
    checklist: Optional[List[str]] = None
    reminders: Optional[List[ReminderConfig]] = None
    is_active: Optional[bool] = None


class WorkflowConfigUpdate(BaseModel):
    stages: List[WorkflowStageUpdate]

