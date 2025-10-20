"""公告路由"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementListResponse,
    AnnouncementCreateResponse,
)
from app.services.announcement_service import AnnouncementService
from app.utils.auth import get_current_user, require_permission, require_superuser

router = APIRouter(prefix="/announcements", tags=["校园公告"])


@router.get("", response_model=AnnouncementListResponse)
def list_announcements(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = AnnouncementService.list_announcements(db, skip=skip, limit=limit)
    creator_ids = {item.created_by for item in items if item.created_by}
    creator_map: dict[str, str] = {}
    if creator_ids:
        users = (
            db.query(User.id, User.full_name, User.username)
            .filter(User.id.in_(creator_ids))
            .all()
        )
        creator_map = {
            user.id: (user.full_name or user.username or "")
            for user in users
        }

    response_items = []
    for item in items:
        response = AnnouncementResponse.model_validate(
            item,
            from_attributes=True,
        )
        response = response.model_copy(
            update={"created_by_name": creator_map.get(item.created_by)}
        )
        response_items.append(response)

    return AnnouncementListResponse(total=total, items=response_items)


@router.post(
    "",
    response_model=AnnouncementCreateResponse,
    dependencies=[Depends(require_superuser)],
)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.dict()
    data["created_by"] = current_user.id
    announcement = AnnouncementService.create_announcement(db, data)
    response = AnnouncementResponse.model_validate(
        announcement,
        from_attributes=True,
    )
    response = response.model_copy(
        update={"created_by_name": current_user.full_name or current_user.username}
    )
    return AnnouncementCreateResponse(message="公告发布成功", data=response)


@router.delete(
    "/{announcement_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_superuser)],
)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
):
    deleted = AnnouncementService.delete_announcement(db, announcement_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="公告不存在或已删除")
    return {"message": "公告已删除", "id": announcement_id}


