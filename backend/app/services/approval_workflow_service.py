from __future__ import annotations

from datetime import date, timedelta
from typing import List

from sqlalchemy.orm import Session, selectinload

from app.models.approval import ApprovalTask, ApprovalCheckItem, ApprovalHistory
from app.models.contract import Contract
from app.models.workflow import WorkflowStage
from app.models.user import User
from app.services.workflow_service import WorkflowService


class ApprovalWorkflowService:
    DEFAULT_PRIORITY = "medium"

    @staticmethod
    def _calculate_due_date(stage: WorkflowStage, contract: Contract) -> date:
        base_date = contract.entry_date or contract.contract_start or date.today()
        delta = stage.sla_days if stage.sla_days and stage.sla_days > 0 else 5
        return base_date + timedelta(days=delta)

    @classmethod
    def create_workflow_for_contract(cls, db: Session, contract: Contract) -> None:
        if not contract or not contract.id:
            return

        existing_tasks = (
            db.query(ApprovalTask.id)
            .filter(ApprovalTask.contract_id == contract.id)
            .first()
        )
        if existing_tasks:
            return

        WorkflowService.ensure_default_stages(db)
        stages: List[WorkflowStage] = (
            db.query(WorkflowStage)
            .options(selectinload(WorkflowStage.owner))
            .filter(WorkflowStage.is_active.is_(True))
            .order_by(WorkflowStage.order_index.asc())
            .all()
        )

        if not stages:
            return

        for stage in stages:
            owner_name = None
            if stage.owner:
                owner_name = stage.owner.full_name or stage.owner.username

            # 构建 assignees 列表，包括负责人和所有协助人
            assignees = []
            if owner_name:
                assignees.append(owner_name)
            
            # 如果有协助人，查询他们的信息并添加到 assignees
            if stage.assistants:
                assistant_users = db.query(User).filter(User.id.in_(stage.assistants)).all()
                for assistant in assistant_users:
                    assistant_name = assistant.full_name or assistant.username
                    if assistant_name and assistant_name not in assignees:
                        assignees.append(assistant_name)

            task = ApprovalTask(
                contract_id=contract.id,
                teacher_name=contract.name or "",
                department=contract.department or "",
                stage=stage.key,
                status="pending",
                priority=cls.DEFAULT_PRIORITY,
                owner=owner_name or "待指派",
                assignees=assignees,
                due_date=cls._calculate_due_date(stage, contract),
                remarks=stage.description,
            )
            db.add(task)
            db.flush()

            for index, label in enumerate(stage.checklist or []):
                item = ApprovalCheckItem(
                    task_id=task.id,
                    label=label,
                    completed=False,
                    order=index,
                )
                db.add(item)

            history = ApprovalHistory(
                task_id=task.id,
                action="created",
                operator="system",
                comment="系统根据流程配置生成审批任务",
            )
            db.add(history)

        db.flush()

