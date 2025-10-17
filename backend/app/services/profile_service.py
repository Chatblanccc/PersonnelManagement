"""个人中心服务层"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from app.models import Notification, User
from app.schemas.profile import (
    NotificationCreate,
    NotificationResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.utils.auth import get_password_hash, verify_password


class ProfileService:
    """个人中心服务"""

    @staticmethod
    def get_user_profile(db: Session, user_id: str) -> Optional[UserProfileResponse]:
        """获取用户个人信息"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # 提取角色名称列表
        role_names = [role.name for role in user.roles]

        return UserProfileResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            teacher_code=user.teacher_code,
            department=user.department,
            position=user.position,
            job_status=user.job_status,
            phone_number=user.phone_number,
            status=user.status,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=role_names,
        )

    @staticmethod
    def update_user_profile(
        db: Session, user_id: str, profile_data: UserProfileUpdate
    ) -> Optional[UserProfileResponse]:
        """更新用户个人信息"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # 更新字段
        update_data = profile_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)

        return ProfileService.get_user_profile(db, user_id)

    @staticmethod
    def change_password(
        db: Session, user_id: str, old_password: str, new_password: str
    ) -> tuple[bool, str]:
        """修改密码"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "用户不存在"

        # 验证旧密码
        if not verify_password(old_password, user.password_hash):
            return False, "当前密码不正确"

        # 更新密码
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()

        return True, "密码修改成功"

    @staticmethod
    def update_avatar(db: Session, user_id: str, avatar_url: str) -> Optional[str]:
        """更新头像"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        user.avatar_url = avatar_url
        user.updated_at = datetime.utcnow()
        db.commit()

        return avatar_url


class NotificationService:
    """通知服务"""

    @staticmethod
    def create_notification(
        db: Session, notification_data: NotificationCreate
    ) -> NotificationResponse:
        """创建通知"""
        notification = Notification(**notification_data.model_dump())
        db.add(notification)
        db.commit()
        db.refresh(notification)

        return NotificationResponse.model_validate(notification)

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
    ) -> tuple[List[NotificationResponse], int, int]:
        """获取用户通知列表"""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        # 获取未读数量
        unread_count = (
            db.query(Notification)
            .filter(
                and_(Notification.user_id == user_id, Notification.is_read == False)
            )
            .count()
        )

        # 获取总数
        total = query.count()

        # 分页查询
        notifications = (
            query.order_by(desc(Notification.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        notification_list = [
            NotificationResponse.model_validate(n) for n in notifications
        ]

        return notification_list, total, unread_count

    @staticmethod
    def mark_as_read(
        db: Session, user_id: str, notification_ids: List[str]
    ) -> int:
        """标记通知为已读"""
        result = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.id.in_(notification_ids),
                    Notification.is_read == False,
                )
            )
            .update(
                {
                    "is_read": True,
                    "read_at": datetime.utcnow(),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return result

    @staticmethod
    def mark_all_as_read(db: Session, user_id: str) -> int:
        """标记所有通知为已读"""
        result = (
            db.query(Notification)
            .filter(
                and_(Notification.user_id == user_id, Notification.is_read == False)
            )
            .update(
                {
                    "is_read": True,
                    "read_at": datetime.utcnow(),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return result

    @staticmethod
    def delete_notification(
        db: Session, user_id: str, notification_id: str
    ) -> bool:
        """删除通知"""
        notification = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id,
                )
            )
            .first()
        )

        if not notification:
            return False

        db.delete(notification)
        db.commit()
        return True

    @staticmethod
    def create_approval_notification(
        db: Session,
        user_id: str,
        approval_id: str,
        notification_type: str,
        title: str,
        content: str,
    ) -> NotificationResponse:
        """创建审批相关通知"""
        notification_data = NotificationCreate(
            user_id=user_id,
            type=notification_type,
            title=title,
            content=content,
            link_url=f"/approvals?id={approval_id}",
            related_approval_id=approval_id,
        )
        return NotificationService.create_notification(db, notification_data)

    @staticmethod
    def create_contract_expiring_notification(
        db: Session,
        user_id: str,
        contract_id: str,
        teacher_name: str,
        expiring_date: str,
    ) -> NotificationResponse:
        """创建合同到期提醒"""
        notification_data = NotificationCreate(
            user_id=user_id,
            type="contract_expiring",
            title=f"合同即将到期提醒",
            content=f"{teacher_name} 的合同将于 {expiring_date} 到期，请及时处理。",
            link_url=f"/contracts?id={contract_id}",
            related_contract_id=contract_id,
        )
        return NotificationService.create_notification(db, notification_data)

