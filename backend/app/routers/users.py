from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    RoleListResponse,
    RoleRead,
    UserCreate,
    UserListResponse,
    UserRead,
    UserUpdate,
)
from app.services.user_service import UserService
from app.utils.auth import require_permission


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_permission("settings.manage"))])


@router.get("/", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    users = UserService.list_users(db, page=page, page_size=page_size)
    total = UserService.count_users(db)

    return UserListResponse(
        data=[UserRead.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        user = UserService.create_user(
            db,
            username=payload.username,
            password=payload.password,
            email=payload.email,
            full_name=payload.full_name,
            roles=payload.roles,
            is_superuser=payload.is_superuser,
            status=payload.status,
            is_active=payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    try:
        user = UserService.update_user(
            db,
            user_id,
            email=payload.email,
            full_name=payload.full_name,
            status=payload.status,
            is_active=payload.is_active,
            is_superuser=payload.is_superuser,
            roles=payload.roles,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return UserRead.model_validate(user)


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    try:
        UserService.delete_user(db, user_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "用户不存在":
            raise HTTPException(status_code=404, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc

    return {"message": "删除成功"}


@router.get("/roles", response_model=RoleListResponse)
def list_roles(db: Session = Depends(get_db)):
    roles = UserService.list_roles(db)
    return RoleListResponse(
        data=[RoleRead.model_validate(role) for role in roles],
        total=len(roles),
    )

