from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.utils.auth import require_permission
from app.schemas.approval import (
    ApprovalActionRequest,
    ApprovalActionResponse,
    ApprovalTaskListResponse,
    ApprovalTaskRead,
    ApprovalStatsOverview,
    ApprovalStageSummary,
    ApprovalHistoryRead,
)
from app.services.approval_service import ApprovalService, ApprovalTaskFilters
from app.models.user import User

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("/tasks", response_model=ApprovalTaskListResponse)
async def get_approval_tasks(
    status: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    filter_by_user: bool = Query(True, description="是否按用户过滤任务，当stage=all时建议设为False以查看所有任务"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    获取审批任务列表（分页）
    - filter_by_user=True: 只返回当前用户负责或被指派的任务（具体节点视图）
    - filter_by_user=False: 返回所有任务（全部节点管理视图）
    """
    user_identifier = current_user.full_name or current_user.username
    
    filters = ApprovalTaskFilters(
        status=status if status != "all" else None,
        stage=stage if stage != "all" else None,
        keyword=keyword,
        # 只有在 filter_by_user=True 时才按用户过滤
        current_user_identifier=user_identifier if filter_by_user else None,
    )

    tasks, total = ApprovalService.list_tasks(
        db=db,
        filters=filters,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return ApprovalTaskListResponse(
        data=[ApprovalTaskRead.model_validate(task) for task in tasks],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/tasks/{task_id}/approve", response_model=ApprovalActionResponse)
async def approve_task(
    task_id: str,
    payload: ApprovalActionRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    通过审批任务并更新业务状态
    """
    task = ApprovalService.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批任务不存在")
    
    # 验证用户是否有权限操作该任务
    user_identifier = current_user.full_name or current_user.username
    if not ApprovalService.can_user_operate_task(task, user_identifier, current_user.is_superuser):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="您无权操作此审批任务，该任务不属于您负责或被指派的范围"
        )
    
    if task.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="审批任务已完成")
    if task.status == "returned":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="审批任务已退回")

    operator = current_user.full_name or current_user.username or "unknown"
    updated_task = ApprovalService.update_task_status(
        db=db,
        task_id=task_id,
        status="completed",
        latest_action="approved",
        operator=operator,
        comment=payload.comment if payload else None,
        mark_check_items_completed=True,
    )
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批任务不存在")

    return ApprovalActionResponse(task=ApprovalTaskRead.model_validate(updated_task))


@router.post("/tasks/{task_id}/return", response_model=ApprovalActionResponse)
async def return_task(
    task_id: str,
    payload: ApprovalActionRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    退回审批任务
    """
    task = ApprovalService.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批任务不存在")
    
    # 验证用户是否有权限操作该任务
    user_identifier = current_user.full_name or current_user.username
    if not ApprovalService.can_user_operate_task(task, user_identifier, current_user.is_superuser):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="您无权操作此审批任务，该任务不属于您负责或被指派的范围"
        )
    
    if task.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="审批任务已完成，无法退回")
    if task.status == "returned":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="审批任务已退回")

    operator = current_user.full_name or current_user.username or "unknown"
    updated_task = ApprovalService.update_task_status(
        db=db,
        task_id=task_id,
        status="returned",
        latest_action="returned",
        operator=operator,
        comment=payload.comment if payload else None,
        mark_check_items_completed=False,
    )
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批任务不存在")

    return ApprovalActionResponse(task=ApprovalTaskRead.model_validate(updated_task))


@router.get("/stats/overview", response_model=ApprovalStatsOverview)
async def get_approval_stats_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    获取审批统计概览 - 只统计当前用户的任务
    """
    user_identifier = current_user.full_name or current_user.username
    stats = ApprovalService.get_overview_stats(db, user_identifier=user_identifier)
    return ApprovalStatsOverview(**stats)


@router.get("/stats/stages", response_model=list[ApprovalStageSummary])
async def get_approval_stage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    获取各阶段审批统计 - 只统计当前用户的任务
    """
    user_identifier = current_user.full_name or current_user.username
    summary = ApprovalService.get_stage_summary(db, user_identifier=user_identifier)
    return [ApprovalStageSummary(**item) for item in summary]


@router.get("/tasks/{task_id}/history", response_model=list[ApprovalHistoryRead], dependencies=[Depends(require_permission("contracts.audit"))])
async def get_approval_history(
    task_id: str,
    db: Session = Depends(get_db),
):
    """
    获取审批任务的历史记录
    """
    history = ApprovalService.get_history(db, task_id)
    return [ApprovalHistoryRead.model_validate(h) for h in history]


@router.post("/tasks/send-reminder")
async def send_approval_reminder(
    contract_id: Optional[str] = Query(None, description="合同ID"),
    teacher_name: Optional[str] = Query(None, description="教师姓名"),
    department: Optional[str] = Query(None, description="部门"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    发送审批提醒通知给相关负责人
    - 可以通过合同ID或教师姓名+部门来发送提醒
    - 会给所有待处理和处理中的审批任务的负责人和协作人发送通知
    """
    if not contract_id and not (teacher_name and department):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="必须提供 contract_id 或 teacher_name+department"
        )
    
    sender_name = current_user.full_name or current_user.username
    
    count = ApprovalService.send_approval_reminder(
        db=db,
        contract_id=contract_id,
        teacher_name=teacher_name,
        department=department,
        sender_name=sender_name,
    )
    
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到待处理的审批任务或没有可提醒的用户"
        )
    
    return {
        "success": True,
        "message": f"已成功发送 {count} 条提醒通知",
        "notification_count": count,
    }


@router.delete("/tasks/{task_id}")
async def delete_approval_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    删除审批任务
    - 只有任务的负责人或管理员可以删除
    """
    task = ApprovalService.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批任务不存在")
    
    user_identifier = current_user.full_name or current_user.username
    
    # 验证权限：只有任务负责人或超级管理员可以删除
    is_owner = ApprovalService.can_user_operate_task(task, user_identifier)
    is_superuser = current_user.is_superuser
    
    if not is_owner and not is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您无权删除此审批任务，只有任务负责人或管理员可以删除"
        )
    
    success = ApprovalService.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="删除失败，任务不存在")
    
    return {"message": "审批任务已成功删除", "task_id": task_id}


@router.delete("/tasks/batch/by-contract/{contract_id}")
async def delete_all_approval_tasks_by_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    删除某个合同的所有审批任务（整个审批流程）
    - 只有超级管理员可以删除整个流程
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您无权删除整个审批流程，只有超级管理员可以执行此操作"
        )
    
    count = ApprovalService.delete_all_tasks_by_contract(db, contract_id)
    
    if count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到该合同的审批任务")
    
    return {"message": f"已成功删除 {count} 个审批任务", "deleted_count": count, "contract_id": contract_id}


@router.delete("/tasks/batch/by-teacher")
async def delete_all_approval_tasks_by_teacher(
    teacher_name: str = Query(..., description="教师姓名"),
    department: str = Query(..., description="部门"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("contracts.audit")),
):
    """
    删除某个教师的所有审批任务（按姓名和部门匹配）
    - 只有超级管理员可以删除整个流程
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您无权删除整个审批流程，只有超级管理员可以执行此操作"
        )
    
    count = ApprovalService.delete_all_tasks_by_teacher(db, teacher_name, department)
    
    if count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"未找到教师 {teacher_name}（{department}）的审批任务"
        )
    
    return {
        "message": f"已成功删除 {count} 个审批任务", 
        "deleted_count": count, 
        "teacher_name": teacher_name,
        "department": department
    }

