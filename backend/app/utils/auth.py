from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import Permission, Role, User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = HTTPBearer(auto_error=False)

BCRYPT_MAX_PASSWORD_BYTES = 72


def _normalize_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) <= BCRYPT_MAX_PASSWORD_BYTES:
        return password
    truncated = encoded[:BCRYPT_MAX_PASSWORD_BYTES]
    return truncated.decode("utf-8", errors="ignore")


class TokenType:
    ACCESS = "access"
    REFRESH = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    normalized = _normalize_password(plain_password)
    return pwd_context.verify(normalized, hashed_password)


def get_password_hash(password: str) -> str:
    normalized = _normalize_password(password)
    return pwd_context.hash(normalized)


def _create_token(
    *,
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    roles: Optional[Iterable[str]] = None,
    permissions: Optional[Iterable[str]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "token_type": token_type,
    }
    if roles is not None:
        to_encode["roles"] = list(roles)
    if permissions is not None:
        to_encode["permissions"] = list(permissions)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def create_access_token(
    *,
    subject: str,
    roles: Iterable[str],
    permissions: Iterable[str],
    expires_minutes: Optional[int] = None,
) -> str:
    expires_delta = timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return _create_token(
        subject=subject,
        token_type=TokenType.ACCESS,
        expires_delta=expires_delta,
        roles=roles,
        permissions=permissions,
    )


def create_refresh_token(*, subject: str) -> str:
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(
        subject=subject,
        token_type=TokenType.REFRESH,
        expires_delta=expires_delta,
    )


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:  # pragma: no cover - fastapi handles response
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
        ) from exc
    return payload


def get_user_permissions(user: User) -> List[str]:
    permissions: set[str] = set()
    for role in user.roles:
        for permission in role.permissions:
            permissions.add(permission.code)
    if user.is_superuser:
        permissions.add("*")
    return sorted(permissions)


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not user.is_active:
        raise HTTPException(status_code=400, detail="账号已被禁用")
    try:
        password_valid = verify_password(password, user.password_hash)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not password_valid:
        return None
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证信息",
        )
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="认证类型错误")

    payload = decode_token(credentials.credentials)

    if payload.get("token_type") != TokenType.ACCESS:
        raise HTTPException(status_code=401, detail="令牌类型错误")

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="令牌无效")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在或已被删除")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")

    return user


def require_permission(permission_code: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.is_superuser:
            return user
        for role in user.roles:
            if any(perm.code == permission_code for perm in role.permissions):
                return user
        raise HTTPException(status_code=403, detail="权限不足")

    return dependency


def require_roles(*role_names: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.is_superuser:
            return user
        user_role_names = {role.name for role in user.roles}
        if user_role_names.intersection(role_names):
            return user
        raise HTTPException(status_code=403, detail="角色不足")

    return dependency

