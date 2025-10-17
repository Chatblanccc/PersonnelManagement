"""公告服务"""
from __future__ import annotations

from typing import Tuple

from sqlalchemy.orm import Session

from app.models.announcement import Announcement


class AnnouncementService:
    @staticmethod
    def list_announcements(db: Session, skip: int = 0, limit: int = 20) -> Tuple[list[Announcement], int]:
        query = db.query(Announcement).order_by(Announcement.is_top.desc(), Announcement.created_at.desc())
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create_announcement(db: Session, data: dict) -> Announcement:
        announcement = Announcement(**data)
        db.add(announcement)
        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def get_announcement(db: Session, announcement_id: str) -> Announcement | None:
        return db.query(Announcement).filter(Announcement.id == announcement_id).first()

    @staticmethod
    def delete_announcement(db: Session, announcement_id: str) -> bool:
        announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
        if not announcement:
            return False
        db.delete(announcement)
        db.commit()
        return True


