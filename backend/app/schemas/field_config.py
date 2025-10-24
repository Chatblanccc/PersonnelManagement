from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


FieldType = Literal["text", "date", "number", "select"]


class FieldConfigBase(BaseModel):
    key: str = Field(..., description="字段唯一标识")
    label: str = Field(..., description="字段显示名称")
    group: str = Field(..., description="所属分组")
    type: FieldType = Field("text", description="字段类型")
    width: Optional[int] = Field(None, ge=60, le=600)
    editable: bool = True
    required: bool = False
    fixed: bool = False
    options: Optional[list[str]] = None
    description: Optional[str] = None
    order_index: Optional[int] = Field(None, ge=1, le=2000)


class FieldConfigResponse(FieldConfigBase):
    id: str
    is_custom: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FieldConfigCreate(FieldConfigBase):
    key: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z][a-zA-Z0-9_]*$")
    is_custom: bool = True


class FieldConfigUpdate(BaseModel):
    label: Optional[str] = None
    group: Optional[str] = None
    type: Optional[FieldType] = None
    width: Optional[int] = Field(None, ge=60, le=600)
    editable: Optional[bool] = None
    required: Optional[bool] = None
    fixed: Optional[bool] = None
    options: Optional[list[str]] = None
    description: Optional[str] = None
    order_index: Optional[int] = Field(None, ge=1, le=2000)


class FieldConfigCollection(BaseModel):
    items: list[FieldConfigResponse]


