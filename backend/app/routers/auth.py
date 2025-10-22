from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas import LoginRequest, Token, RefreshRequest, MeResponse, UserRead, TokenPayload
from app.services.user_service import UserService
from app.services.operation_log_service import OperationLogService
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
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Token:
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

    OperationLogService.log(
        db=db,
        module="auth",
        action="login",
        operator=user,
        summary="用户登录系统",
        detail=f"用户 {user.username} 登录成功",
        request=request,
        extra={"roles": roles, "permissions": permissions},
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)) -> Token:
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

    token = Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    OperationLogService.log(
        db=db,
        module="auth",
        action="refresh_token",
        operator=user,
        summary="刷新令牌",
        detail=f"用户 {user.username} 刷新 access token",
        request=request,
    )

    return token


@router.get("/me", response_model=MeResponse)
def read_me(user=Depends(get_current_user)) -> MeResponse:
    permissions = get_user_permissions(user)
    roles = [role.name for role in user.roles]
    return MeResponse(
        user=UserRead.model_validate(user),
        permissions=permissions,
    )


@router.post("/logout")
def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    # 目前为无状态处理，前端只需丢弃令牌
    if not credentials:
        raise HTTPException(status_code=401, detail="未登录")
    payload = decode_token(credentials.credentials)
    operator: User | None = None
    if payload.get("sub"):
        operator = db.query(User).filter(User.id == payload["sub"]).first()

    if operator:
        OperationLogService.log(
            db=db,
            module="auth",
            action="logout",
            operator=operator,
            summary="用户退出登录",
            detail=f"用户 {operator.username} 注销登录",
            request=request,
        )

    return {"message": "已注销"}


