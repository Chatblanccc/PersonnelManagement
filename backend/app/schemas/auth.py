from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PermissionRead(BaseModel):
    id: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_system: bool = False
    is_default: bool = False
    permissions: List[PermissionRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class UserRead(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    status: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    last_login: Optional[datetime] = None
    
    # 个人中心新增字段
    avatar_url: Optional[str] = None
    teacher_code: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    job_status: Optional[str] = None
    phone_number: Optional[str] = None
    
    roles: List[RoleRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    sub: str
    exp: int
    roles: List[str] = []
    permissions: List[str] = []
    token_type: str = "access"


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshTokenPayload(BaseModel):
    sub: str
    exp: int
    token_type: str = "refresh"


class MeResponse(BaseModel):
    user: UserRead
    permissions: List[str]


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    email: Optional[str] = Field(default=None, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default="active", max_length=20)
    is_active: bool = True
    is_superuser: bool = False
    roles: List[str] = Field(default_factory=list)


class UserUpdate(BaseModel):
    email: Optional[str] = Field(default=None, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=20)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    roles: Optional[List[str]] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, max_length=255)
    permissions: List[str] = Field(default_factory=list)
    is_system: bool = False
    is_default: bool = False


class RoleUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=255)
    permissions: Optional[List[str]] = None
    is_default: Optional[bool] = None


class UserListResponse(BaseModel):
    data: List[UserRead]
    total: int
    page: int
    page_size: int


class RoleListResponse(BaseModel):
    data: List[RoleRead]
    total: int

