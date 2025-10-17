"""个人中心路由"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.profile import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    MarkAsReadRequest,
    NotificationList,
    NotificationResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.services.profile_service import NotificationService, ProfileService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["个人中心"])


# ============ 基础信息相关 ============

@router.get("/me", response_model=UserProfileResponse, summary="获取当前用户信息")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    获取当前登录用户的个人信息
    
    返回：
    - 用户基础信息（姓名、工号、部门、岗位等）
    - 在职状态
    - 角色列表
    """
    profile = ProfileService.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户信息不存在"
        )
    return profile


@router.patch("/me", response_model=UserProfileResponse, summary="更新个人信息")
def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    更新当前用户的个人信息
    
    可更新字段：
    - full_name: 姓名
    - avatar_url: 头像URL
    - email: 邮箱
    - phone_number: 电话号码
    """
    profile = ProfileService.update_user_profile(db, current_user.id, profile_data)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户信息不存在"
        )
    return profile


@router.post("/avatar", summary="上传头像")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    上传用户头像
    
    注意：
    - 支持格式：jpg, jpeg, png, gif
    - 文件大小限制：5MB
    """
    # 检查文件类型
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件格式，仅支持 jpg, jpeg, png, gif"
        )

    # 检查文件大小（5MB）
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小超过 5MB 限制"
        )

    # TODO: 实现文件上传到存储服务（如 Supabase Storage 或本地目录）
    # 这里先返回一个示例 URL
    import hashlib
    import os
    from datetime import datetime

    # 生成唯一文件名
    file_hash = hashlib.md5(content).hexdigest()
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"avatar_{current_user.id}_{file_hash}{ext}"
    
    # 保存到本地 uploads/avatars 目录
    upload_dir = "uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 生成访问 URL
    avatar_url = f"/uploads/avatars/{unique_filename}"
    
    # 更新数据库
    updated_url = ProfileService.update_avatar(db, current_user.id, avatar_url)
    
    return {
        "success": True,
        "avatar_url": updated_url,
        "message": "头像上传成功"
    }


# ============ 安全与账号设置 ============

@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    summary="修改密码"
)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    修改当前用户密码
    
    要求：
    - 需要提供当前密码进行验证
    - 新密码至少 6 位
    - 新密码与确认密码必须一致
    """
    # 验证新密码和确认密码是否一致
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码与确认密码不一致"
        )

    # 修改密码
    success, message = ProfileService.change_password(
        db,
        current_user.id,
        password_data.old_password,
        password_data.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return ChangePasswordResponse(success=True, message=message)


# ============ 通知与消息 ============

@router.get(
    "/notifications",
    response_model=NotificationList,
    summary="获取通知列表"
)
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    获取当前用户的通知列表
    
    参数：
    - skip: 跳过的记录数（分页）
    - limit: 返回的记录数（默认 20）
    - unread_only: 仅显示未读通知（默认 False）
    
    返回：
    - total: 总通知数
    - unread_count: 未读通知数
    - items: 通知列表
    """
    notifications, total, unread_count = NotificationService.get_user_notifications(
        db, current_user.id, skip, limit, unread_only
    )

    return NotificationList(
        total=total,
        unread_count=unread_count,
        items=notifications
    )


@router.get(
    "/notifications/unread-count",
    summary="获取未读通知数量"
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取未读通知数量"""
    _, _, unread_count = NotificationService.get_user_notifications(
        db, current_user.id, 0, 1, unread_only=False
    )
    return {"unread_count": unread_count}


@router.post(
    "/notifications/mark-read",
    summary="标记通知为已读"
)
def mark_notifications_as_read(
    request: MarkAsReadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    标记指定通知为已读
    
    参数：
    - notification_ids: 通知 ID 列表
    """
    count = NotificationService.mark_as_read(
        db, current_user.id, request.notification_ids
    )
    return {
        "success": True,
        "message": f"已标记 {count} 条通知为已读"
    }


@router.post(
    "/notifications/mark-all-read",
    summary="标记所有通知为已读"
)
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """标记所有通知为已读"""
    count = NotificationService.mark_all_as_read(db, current_user.id)
    return {
        "success": True,
        "message": f"已标记 {count} 条通知为已读"
    }


@router.delete(
    "/notifications/{notification_id}",
    summary="删除通知"
)
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除指定通知"""
    success = NotificationService.delete_notification(
        db, current_user.id, notification_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在或已被删除"
        )
    
    return {
        "success": True,
        "message": "通知已删除"
    }

