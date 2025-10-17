from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import List, Optional, Dict

from sqlalchemy import case, func, or_, cast, String
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.dialects.postgresql import JSONB

from app.models.approval import ApprovalHistory, ApprovalTask
from app.models.contract import Contract
from app.models.workflow import WorkflowStage


@dataclass
class ApprovalTaskFilters:
    status: Optional[str] = None
    stage: Optional[str] = None
    keyword: Optional[str] = None
    current_user_identifier: Optional[str] = None


class ApprovalService:
    @staticmethod
    def _get_stage_order_map(db: Session) -> Dict[str, int]:
        """获取审批阶段的顺序映射"""
        stages = db.query(WorkflowStage).filter(WorkflowStage.is_active.is_(True)).all()
        return {stage.key: stage.order_index for stage in stages}
    
    @staticmethod
    def _is_predecessor_completed(db: Session, task: ApprovalTask, stage_order_map: Dict[str, int]) -> bool:
        """
        检查前置阶段是否已完成
        
        Args:
            db: 数据库会话
            task: 当前审批任务
            stage_order_map: 阶段顺序映射
            
        Returns:
            如果前置阶段都已完成返回 True，否则返回 False
        """
        # 如果没有 contract_id，无法判断前置阶段，默认允许
        if not task.contract_id:
            return True
        
        # 获取当前阶段的顺序
        current_order = stage_order_map.get(task.stage, 0)
        
        # 如果是第一个阶段，没有前置阶段，直接返回 True
        if current_order <= 1:
            return True
        
        # 查询同一合同的所有审批任务
        all_tasks = (
            db.query(ApprovalTask)
            .filter(ApprovalTask.contract_id == task.contract_id)
            .all()
        )
        
        # 检查所有前置阶段是否都已完成
        for other_task in all_tasks:
            other_order = stage_order_map.get(other_task.stage, 0)
            # 如果是前置阶段（order 更小）且未完成，返回 False
            if other_order < current_order and other_order > 0:
                if other_task.status != 'completed':
                    return False
        
        return True
    
    @staticmethod
    def list_tasks(
        db: Session,
        *,
        filters: ApprovalTaskFilters,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[ApprovalTask], int]:
        query = db.query(ApprovalTask)

        # 根据当前用户过滤任务（只显示用户负责或被指派的任务）
        if filters.current_user_identifier:
            # 使用 PostgreSQL 的 JSON 包含操作符 @>
            # 将用户标识转换为 JSON 数组格式进行查询
            import json
            user_json = json.dumps([filters.current_user_identifier])
            query = query.filter(
                or_(
                    ApprovalTask.owner == filters.current_user_identifier,
                    cast(ApprovalTask.assignees, String).like(f'%"{filters.current_user_identifier}"%')
                )
            )

        if filters.status and filters.status != "all":
            query = query.filter(ApprovalTask.status == filters.status)

        if filters.stage and filters.stage != "all":
            query = query.filter(ApprovalTask.stage == filters.stage)

        if filters.keyword:
            keyword_like = f"%{filters.keyword}%"
            query = query.filter(
                or_(
                    ApprovalTask.teacher_name.ilike(keyword_like),
                    ApprovalTask.department.ilike(keyword_like),
                    ApprovalTask.owner.ilike(keyword_like),
                )
            )

        # 获取所有符合条件的任务（暂不考虑前置阶段）
        all_candidate_tasks = query.all()
        
        # 获取阶段顺序映射
        stage_order_map = ApprovalService._get_stage_order_map(db)
        
        # 过滤掉前置阶段未完成的任务
        filtered_tasks = [
            task for task in all_candidate_tasks
            if ApprovalService._is_predecessor_completed(db, task, stage_order_map)
        ]
        
        total = len(filtered_tasks)
        
        # 手动排序和分页
        filtered_tasks.sort(key=lambda t: (t.due_date, -(['low', 'medium', 'high'].index(t.priority) if t.priority in ['low', 'medium', 'high'] else 0)))
        
        start = (page - 1) * page_size
        end = start + page_size
        tasks = filtered_tasks[start:end]

        return tasks, total

    @staticmethod
    def get_task(db: Session, task_id: str) -> Optional[ApprovalTask]:
        return (
            db.query(ApprovalTask)
            .options(selectinload(ApprovalTask.check_items))
            .filter(ApprovalTask.id == task_id)
            .first()
        )

    @staticmethod
    def update_task_status(
        db: Session,
        *,
        task_id: str,
        status: str,
        latest_action: str,
        operator: str,
        comment: Optional[str] = None,
        mark_check_items_completed: bool = False,
    ) -> Optional[ApprovalTask]:
        task = (
            db.query(ApprovalTask)
            .options(selectinload(ApprovalTask.check_items))
            .filter(ApprovalTask.id == task_id)
            .first()
        )
        if task is None:
            return None

        if mark_check_items_completed:
            for item in task.check_items:
                item.completed = True

        task.status = status
        task.latest_action = latest_action

        if task.contract_id:
            contract = db.query(Contract).filter(Contract.id == task.contract_id).first()
            if contract is not None:
                # 获取该合同的所有审批任务
                all_tasks = db.query(ApprovalTask).filter(
                    ApprovalTask.contract_id == task.contract_id
                ).all()
                
                # 获取阶段顺序映射
                stage_order_map = ApprovalService._get_stage_order_map(db)
                
                # 按流程顺序过滤，只考虑前置阶段已完成的任务
                active_tasks = [
                    t for t in all_tasks
                    if ApprovalService._is_predecessor_completed(db, t, stage_order_map)
                ]
                
                # 根据活跃任务的状态计算整体状态
                if active_tasks:
                    active_statuses = [t.status for t in active_tasks]
                    
                    if 'returned' in active_statuses:
                        # 如果有任何活跃任务被退回，整体状态为 returned
                        overall = 'returned'
                    elif all(s == 'completed' for s in active_statuses):
                        # 如果所有活跃任务都已完成
                        # 检查是否还有未激活的后续任务
                        has_pending_next_stage = len(active_tasks) < len(all_tasks)
                        
                        if has_pending_next_stage:
                            # 还有后续阶段，状态为 in_progress
                            overall = 'in_progress'
                        else:
                            # 所有任务都已完成，状态为 approved
                            overall = 'approved'
                    elif any(s in ('in_progress', 'completed') for s in active_statuses):
                        # 如果有任务正在进行或已完成
                        overall = 'in_progress'
                    else:
                        # 所有活跃任务都是 pending
                        overall = 'pending'
                else:
                    # 没有活跃任务，保持 pending 状态
                    overall = 'pending'

                contract.approval_status = overall
                if overall == 'approved':
                    contract.approval_completed_at = datetime.now(timezone.utc)
                else:
                    contract.approval_completed_at = None

        db.commit()

        ApprovalService.add_history(
            db=db,
            task_id=task_id,
            action=latest_action,
            operator=operator,
            comment=comment,
        )

        updated_task = (
            db.query(ApprovalTask)
            .options(selectinload(ApprovalTask.check_items))
            .filter(ApprovalTask.id == task_id)
            .first()
        )
        return updated_task

    @staticmethod
    def get_overview_stats(db: Session, user_identifier: Optional[str] = None) -> dict[str, int]:
        query = db.query(ApprovalTask)
        
        # 根据当前用户过滤任务
        if user_identifier:
            query = query.filter(
                or_(
                    ApprovalTask.owner == user_identifier,
                    cast(ApprovalTask.assignees, String).like(f'%"{user_identifier}"%')
                )
            )
        
        all_tasks = query.all()
        
        # 获取阶段顺序映射
        stage_order_map = ApprovalService._get_stage_order_map(db)
        
        # 过滤掉前置阶段未完成的任务
        filtered_tasks = [
            task for task in all_tasks
            if ApprovalService._is_predecessor_completed(db, task, stage_order_map)
        ]
        
        # 统计各状态的数量
        stats = {status: 0 for status in ["pending", "in_progress", "completed", "returned"]}
        for task in filtered_tasks:
            if task.status in stats:
                stats[task.status] += 1
        
        return stats

    @staticmethod
    def get_stage_summary(db: Session, user_identifier: Optional[str] = None) -> List[dict[str, object]]:
        query = db.query(ApprovalTask)
        
        # 根据当前用户过滤任务
        if user_identifier:
            query = query.filter(
                or_(
                    ApprovalTask.owner == user_identifier,
                    cast(ApprovalTask.assignees, String).like(f'%"{user_identifier}"%')
                )
            )
        
        all_tasks = query.all()
        
        # 获取阶段顺序映射
        stage_order_map = ApprovalService._get_stage_order_map(db)
        
        # 过滤掉前置阶段未完成的任务
        filtered_tasks = [
            task for task in all_tasks
            if ApprovalService._is_predecessor_completed(db, task, stage_order_map)
        ]
        
        # 按阶段统计
        stage_stats: Dict[str, Dict[str, int]] = {}
        today = date.today()
        
        for task in filtered_tasks:
            if task.stage not in stage_stats:
                stage_stats[task.stage] = {
                    "total": 0,
                    "pending": 0,
                    "completed": 0,
                    "overdue": 0,
                }
            
            stage_stats[task.stage]["total"] += 1
            
            if task.status == "pending":
                stage_stats[task.stage]["pending"] += 1
            elif task.status == "completed":
                stage_stats[task.stage]["completed"] += 1
            
            if task.due_date and task.due_date < today:
                stage_stats[task.stage]["overdue"] += 1
        
        # 转换为列表格式
        summary: List[dict[str, object]] = []
        for stage, stats in stage_stats.items():
            summary.append({
                "stage": stage,
                "total": stats["total"],
                "pending": stats["pending"],
                "completed": stats["completed"],
                "overdue": stats["overdue"],
            })
        
        return summary

    @staticmethod
    def get_history(db: Session, task_id: str) -> List[ApprovalHistory]:
        return (
            db.query(ApprovalHistory)
            .filter(ApprovalHistory.task_id == task_id)
            .order_by(ApprovalHistory.created_at.desc())
            .all()
        )

    @staticmethod
    def can_user_operate_task(task: ApprovalTask, user_identifier: str, is_superuser: bool = False) -> bool:
        """
        检查用户是否有权限操作该审批任务
        用户必须是任务的负责人（owner）、被指派人员（assignees）之一，或者是超级管理员
        """
        # 超级管理员可以操作所有任务
        if is_superuser:
            return True
        
        # 任务负责人可以操作
        if task.owner == user_identifier:
            return True
        
        # 被指派人员可以操作
        if isinstance(task.assignees, list) and user_identifier in task.assignees:
            return True
        
        return False

    @staticmethod
    def add_history(
        db: Session,
        *,
        task_id: str,
        action: str,
        operator: str,
        comment: Optional[str] = None,
    ) -> ApprovalHistory:
        history = ApprovalHistory(
            task_id=task_id,
            action=action,
            operator=operator,
            comment=comment,
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        return history

    @staticmethod
    def delete_task(db: Session, task_id: str) -> bool:
        """
        删除审批任务及其关联的历史记录
        
        Args:
            db: 数据库会话
            task_id: 任务ID
            
        Returns:
            删除成功返回 True，任务不存在返回 False
        """
        task = db.query(ApprovalTask).filter(ApprovalTask.id == task_id).first()
        if task is None:
            return False
        
        # 由于设置了 cascade="all, delete-orphan"，删除任务时会自动删除关联的历史记录和核查项
        db.delete(task)
        db.commit()
        return True

    @staticmethod
    def delete_all_tasks_by_contract(db: Session, contract_id: str) -> int:
        """
        删除某个合同关联的所有审批任务（整个审批流程）
        
        Args:
            db: 数据库会话
            contract_id: 合同ID
            
        Returns:
            删除的任务数量
        """
        tasks = db.query(ApprovalTask).filter(ApprovalTask.contract_id == contract_id).all()
        count = len(tasks)
        
        for task in tasks:
            # 由于设置了 cascade="all, delete-orphan"，删除任务时会自动删除关联的历史记录和核查项
            db.delete(task)
        
        db.commit()
        return count

    @staticmethod
    def delete_all_tasks_by_teacher(db: Session, teacher_name: str, department: str) -> int:
        """
        删除某个教师的所有审批任务（按姓名和部门匹配）
        
        Args:
            db: 数据库会话
            teacher_name: 教师姓名
            department: 部门
            
        Returns:
            删除的任务数量
        """
        tasks = db.query(ApprovalTask).filter(
            ApprovalTask.teacher_name == teacher_name,
            ApprovalTask.department == department
        ).all()
        count = len(tasks)
        
        for task in tasks:
            db.delete(task)
        
        db.commit()
        return count
    
    @staticmethod
    def send_approval_reminder(
        db: Session,
        *,
        contract_id: Optional[str] = None,
        teacher_name: Optional[str] = None,
        department: Optional[str] = None,
        sender_name: str,
    ) -> int:
        """
        发送审批提醒通知给相关负责人
        
        Args:
            db: 数据库会话
            contract_id: 合同ID（可选）
            teacher_name: 教师姓名（可选）
            department: 部门（可选）
            sender_name: 发送人姓名
            
        Returns:
            发送的通知数量
        """
        from app.models.user import User
        from app.models.notification import Notification
        
        # 查找相关的审批任务
        query = db.query(ApprovalTask)
        if contract_id:
            query = query.filter(ApprovalTask.contract_id == contract_id)
        elif teacher_name and department:
            query = query.filter(
                ApprovalTask.teacher_name == teacher_name,
                ApprovalTask.department == department
            )
        else:
            return 0
        
        # 只针对待处理和处理中的任务发送提醒
        tasks = query.filter(
            ApprovalTask.status.in_(['pending', 'in_progress'])
        ).all()
        
        if not tasks:
            return 0
        
        # 收集所有需要提醒的用户标识
        user_identifiers = set()
        task_info_list = []
        
        for task in tasks:
            # 添加任务负责人
            user_identifiers.add(task.owner)
            
            # 添加协作人
            if isinstance(task.assignees, list):
                user_identifiers.update(task.assignees)
            
            # 记录任务信息
            task_info_list.append({
                'stage': task.stage,
                'teacher_name': task.teacher_name,
                'department': task.department,
                'due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else '未设置',
            })
        
        # 根据用户标识查找用户ID（通过 full_name 或 username 匹配）
        notification_count = 0
        
        for identifier in user_identifiers:
            # 查找用户（先匹配 full_name，再匹配 username）
            user = db.query(User).filter(
                or_(User.full_name == identifier, User.username == identifier)
            ).first()
            
            if not user:
                continue
            
            # 构建通知内容
            if len(tasks) == 1:
                task = tasks[0]
                stage_map = {
                    'entry': '入职准备',
                    'qualification': '资格审核',
                    'probation': '试用评估',
                    'signature': '合同签署',
                    'archive': '复核归档',
                    'renewal': '续签提醒',
                }
                stage_name = stage_map.get(task.stage, task.stage)
                title = f"审批提醒：{task.teacher_name} - {stage_name}"
                due_date_text = task.due_date.strftime('%Y-%m-%d') if task.due_date else '未设置'
                content = f"{sender_name} 提醒您：{task.teacher_name}（{task.department}）的“{stage_name}”阶段待处理，截止日期：{due_date_text}。"
                link_url = f"/approvals?taskId={task.id}"
                related_approval_id = task.id
            else:
                teacher = tasks[0].teacher_name
                dept = tasks[0].department
                title = f"审批提醒：{teacher} 有 {len(tasks)} 个审批阶段待处理"
                content = f"{sender_name} 提醒您：{teacher}（{dept}）有 {len(tasks)} 个审批阶段需要您处理，请及时跟进。"
                link_url = "/approvals"
                related_approval_id = tasks[0].id
            
            # 创建通知
            notification = Notification(
                user_id=user.id,
                type='approval_pending',
                title=title,
                content=content,
                link_url=link_url,
                related_approval_id=related_approval_id,
                related_contract_id=contract_id,
            )
            db.add(notification)
            notification_count += 1
        
        db.commit()
        return notification_count


