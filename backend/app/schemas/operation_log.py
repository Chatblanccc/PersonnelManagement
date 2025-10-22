"""操作日志相关 Schema"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class OperationLogQuery(BaseModel):
    """操作日志查询参数"""

    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="分页大小")
    module: Optional[str] = Field(None, description="功能模块，如 contracts/auth")
    action: Optional[str] = Field(None, description="动作名称")
    operator: Optional[str] = Field(None, description="操作人用户名或ID")
    start_time: Optional[datetime] = Field(None, description="开始时间")
    end_time: Optional[datetime] = Field(None, description="结束时间")


class OperationLogItem(BaseModel):
    """单条操作日志"""

    id: str
    module: str
    action: str
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    summary: str
    detail: Optional[str] = None
    extra: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OperationLogResponse(BaseModel):
    """操作日志分页响应"""

    total: int
    page: int
    page_size: int
    items: List[OperationLogItem]


