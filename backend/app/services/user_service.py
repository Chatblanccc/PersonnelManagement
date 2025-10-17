from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, OperationalError

from app.models.user import Permission, Role, User
from app.utils.auth import get_password_hash
from app.database import Base


class UserService:
    @staticmethod
    def list_users(
        db: Session,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> List[User]:
        return (
            db.query(User)
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

    @staticmethod
    def count_users(db: Session) -> int:
        return db.query(User).count()

    @staticmethod
    def get_user(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(
        db: Session,
        *,
        username: str,
        password: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        roles: Optional[Iterable[str]] = None,
        is_superuser: bool = False,
        status: Optional[str] = "active",
        is_active: bool = True,
    ) -> User:
        if db.query(User).filter(User.username == username).first():
            raise ValueError("用户名已存在")

        password_hash = get_password_hash(password)

        user = User(
            username=username,
            password_hash=password_hash,
            email=email,
            full_name=full_name,
            status=status,
            is_active=is_active,
            is_superuser=is_superuser,
        )

        if roles:
            role_entities = (
                db.query(Role)
                .filter(Role.name.in_(list(roles)))
                .all()
            )
            user.roles = role_entities

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(
        db: Session,
        user_id: str,
        *,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_superuser: Optional[bool] = None,
        roles: Optional[Iterable[str]] = None,
        password: Optional[str] = None,
    ) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("用户不存在")

        if email is not None:
            user.email = email
        if full_name is not None:
            user.full_name = full_name
        if status is not None:
            user.status = status
        if is_active is not None:
            user.is_active = is_active
        if is_superuser is not None:
            if user.username == "admin" and not is_superuser:
                raise ValueError("Ĭ�Ϲ���Ա�˺Ų�֧�ֶ�����ܹ���Ա��ɫ")
            if not is_superuser:
                remaining_superusers = (
                    db.query(User)
                    .filter(User.is_superuser.is_(True), User.id != user_id)
                    .count()
                )
                if remaining_superusers == 0:
                    raise ValueError("ϵͳ��Ҫ����һ��超级管理员")
            user.is_superuser = is_superuser
        if roles is not None:
            role_entities = (
                db.query(Role)
                .filter(Role.name.in_(list(roles)))
                .all()
            )
            user.roles = role_entities
        if password:
            user.password_hash = get_password_hash(password)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: str) -> None:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("用户不存在")
        if user.username == "admin":
            raise ValueError("默认管理员账号不可删除")
        db.delete(user)
        db.commit()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def update_last_login(db: Session, user: User) -> None:
        user.last_login = datetime.now(timezone.utc)
        db.add(user)
        db.commit()

    @staticmethod
    def list_roles(db: Session) -> List[Role]:
        return db.query(Role).order_by(Role.created_at.asc()).all()

    @staticmethod
    def create_role(
        db: Session,
        *,
        name: str,
        description: Optional[str] = None,
        permissions: Optional[Iterable[str]] = None,
        is_system: bool = False,
        is_default: bool = False,
    ) -> Role:
        if db.query(Role).filter(Role.name == name).first():
            raise ValueError("角色名称已存在")

        role = Role(
            name=name,
            description=description,
            is_system=is_system,
            is_default=is_default,
        )

        if permissions:
            permission_entities = (
                db.query(Permission)
                .filter(Permission.code.in_(list(permissions)))
                .all()
            )
            role.permissions.extend(permission_entities)

        db.add(role)
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def ensure_default_permissions(db: Session) -> None:
        """创建系统默认角色与权限"""
        default_permissions = {
            "contracts.read": "查看合同",
            "contracts.create": "创建合同",
            "contracts.update": "编辑合同",
            "contracts.delete": "删除合同",
            "contracts.import": "导入合同",
            "contracts.export": "导出合同",
            "contracts.audit": "查看审核日志",
            "settings.manage": "管理系统设置",
        }

        try:
            existing_codes = {
                code for (code,) in db.query(Permission.code).all()
            }
        except (ProgrammingError, OperationalError):
            db.rollback()
            Base.metadata.create_all(bind=db.get_bind())
            existing_codes = {
                code for (code,) in db.query(Permission.code).all()
            }

        for code, description in default_permissions.items():
            if code not in existing_codes:
                permission = Permission(code=code, description=description)
                db.add(permission)

        db.commit()

        # 默认角色：管理员、HR、审核员、访客
        role_definitions = {
            "Administrator": {
                "description": "系统管理员",
                "permissions": list(default_permissions.keys()),
                "is_system": True,
            },
            "HR": {
                "description": "人事负责人",
                "permissions": [
                    "contracts.read",
                    "contracts.create",
                    "contracts.update",
                    "contracts.import",
                    "contracts.export",
                    "contracts.audit",
                ],
            },
            "Auditor": {
                "description": "审计员",
                "permissions": [
                    "contracts.read",
                    "contracts.audit",
                    "contracts.export",
                ],
            },
            "Viewer": {
                "description": "访客",
                "permissions": ["contracts.read"],
                "is_default": True,
            },
        }

        for name, config in role_definitions.items():
            role = db.query(Role).filter(Role.name == name).first()
            if role:
                continue

            role = Role(
                name=name,
                description=config.get("description"),
                is_system=config.get("is_system", False),
                is_default=config.get("is_default", False),
            )

            perms = (
                db.query(Permission)
                .filter(Permission.code.in_(config["permissions"]))
                .all()
            )
            role.permissions = perms

            db.add(role)

        db.commit()

        # 确保存在一个管理员用户
        if not db.query(User).filter(User.username == "admin").first():
            admin_role = (
                db.query(Role).filter(Role.name == "Administrator").first()
            )
            user = User(
                username="admin",
                password_hash=get_password_hash("Admin@123456"),
                full_name="系统管理员",
                is_superuser=True,
                is_active=True,
            )
            if admin_role:
                user.roles.append(admin_role)
            db.add(user)
            db.commit()

