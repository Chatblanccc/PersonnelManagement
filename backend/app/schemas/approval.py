from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ApprovalChecklistItem(BaseModel):
    label: str
    completed: bool = False

    class Config:
        from_attributes = True


class ApprovalTaskBase(BaseModel):
    contract_id: Optional[str] = None
    teacher_name: str
    department: str
    stage: str
    status: str
    priority: str
    owner: str
    assignees: List[str] = Field(default_factory=list)
    due_date: date
    remarks: Optional[str] = None
    latest_action: Optional[str] = None


class ApprovalTaskRead(ApprovalTaskBase):
    id: str
    created_at: datetime
    updated_at: datetime
    check_items: List[ApprovalChecklistItem] = Field(default_factory=list)

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True


class ApprovalTaskListResponse(BaseModel):
    data: List[ApprovalTaskRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApprovalStatsOverview(BaseModel):
    pending: int = 0
    in_progress: int = 0
    completed: int = 0
    returned: int = 0


class ApprovalStageSummary(BaseModel):
    stage: str
    total: int
    pending: int
    completed: int
    overdue: int


class ApprovalHistoryRead(BaseModel):
    id: str
    task_id: str
    action: str
    operator: str
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalActionRequest(BaseModel):
    comment: Optional[str] = None


class ApprovalActionResponse(BaseModel):
    task: ApprovalTaskRead


class ApprovalTaskQuery(BaseModel):
    status: Optional[str] = Field(default=None)
    stage: Optional[str] = Field(default=None)
    keyword: Optional[str] = Field(default=None)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


