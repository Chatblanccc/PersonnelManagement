"""个人中心相关 Schema"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ============ 基础信息 Schema ============

class UserProfileBase(BaseModel):
    """用户基础信息基类"""
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    teacher_code: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    job_status: Optional[str] = None
    phone_number: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    """用户个人信息响应"""
    id: str
    status: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    roles: List[str] = []  # 角色名称列表

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """更新个人信息"""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None


# ============ 密码修改 Schema ============

class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=6, description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码")
    confirm_password: str = Field(..., min_length=6, description="确认新密码")


class ChangePasswordResponse(BaseModel):
    """修改密码响应"""
    success: bool
    message: str


# ============ 通知消息 Schema ============

class NotificationBase(BaseModel):
    """通知基础信息"""
    type: str
    title: str
    content: Optional[str] = None
    link_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    """创建通知"""
    user_id: str
    related_contract_id: Optional[str] = None
    related_approval_id: Optional[str] = None


class NotificationResponse(NotificationBase):
    """通知响应"""
    id: str
    user_id: str
    is_read: bool
    read_at: Optional[datetime] = None
    related_contract_id: Optional[str] = None
    related_approval_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    """通知列表响应"""
    total: int
    unread_count: int
    items: List[NotificationResponse]


class MarkAsReadRequest(BaseModel):
    """标记已读请求"""
    notification_ids: List[str]


# ============ 会话管理 Schema ============

class SessionInfo(BaseModel):
    """会话信息"""
    device: str = "Unknown"
    ip_address: str = "Unknown"
    login_time: datetime
    last_active: datetime
    is_current: bool = False


class SessionListResponse(BaseModel):
    """会话列表响应"""
    sessions: List[SessionInfo]

