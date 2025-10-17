from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class AnnouncementBase(BaseModel):
    title: str = Field(..., max_length=200)
    summary: Optional[str] = None
    region: Optional[str] = None
    campus_code: Optional[str] = None
    schedule: Optional[str] = None
    content: Optional[str] = None
    cover_url: Optional[str] = None
    is_top: bool = False


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementResponse(AnnouncementBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class AnnouncementListResponse(BaseModel):
    total: int
    items: list[AnnouncementResponse]


class AnnouncementCreateResponse(BaseModel):
    message: str
    data: AnnouncementResponse


