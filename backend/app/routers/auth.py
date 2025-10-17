from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas import LoginRequest, Token, RefreshRequest, MeResponse, UserRead, TokenPayload
from app.services.user_service import UserService
from app.utils.auth import (
    TokenType,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_user_permissions,
)

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    UserService.ensure_default_permissions(db)

    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    permissions = get_user_permissions(user)
    roles = [role.name for role in user.roles]

    access_token = create_access_token(
        subject=user.id,
        roles=roles,
        permissions=permissions,
    )
    refresh_token = create_refresh_token(subject=user.id)

    UserService.update_last_login(db, user)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> Token:
    token_data = decode_token(payload.refresh_token)
    if token_data.get("token_type") != TokenType.REFRESH:
        raise HTTPException(status_code=401, detail="令牌类型错误")

    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="令牌无效")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    permissions = get_user_permissions(user)
    roles = [role.name for role in user.roles]

    access_token = create_access_token(
        subject=user.id,
        roles=roles,
        permissions=permissions,
    )
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=MeResponse)
def read_me(user=Depends(get_current_user)) -> MeResponse:
    permissions = get_user_permissions(user)
    roles = [role.name for role in user.roles]
    return MeResponse(
        user=UserRead.model_validate(user),
        permissions=permissions,
    )


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    # 目前为无状态处理，前端只需丢弃令牌
    if not credentials:
        raise HTTPException(status_code=401, detail="未登录")
    return {"message": "已注销"}


