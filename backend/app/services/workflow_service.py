from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.workflow import WorkflowStage
from app.models.user import User, Role
from app.schemas.workflow import (
    ReminderConfig,
    SimpleUserSummary,
    WorkflowConfigResponse,
    WorkflowStageRead,
    WorkflowStageUpdate,
)
from app.utils.auth import get_user_permissions


DEFAULT_STAGES: List[dict] = [
    {
        "key": "entry",
        "name": "入职准备",
        "description": "收集身份证明、学历学位、教师资格等资料，完成档案建档。",
        "order_index": 1,
        "sla_days": 2,
        "sla_text": "T+2 工作日完成入职资料核对",
        "checklist": [
            "校验身份证与学历证件扫描件",
            "生成合同草稿并发送校对",
            "同步发起体检与背景核查",
        ],
        "reminders": [
            {
                "label": "入职资料校验提醒",
                "offset_days": -1,
                "channels": ["wechat"],
                "notes": "提醒入职专员补齐信息",
            }
        ],
    },
    {
        "key": "qualification",
        "name": "资格审核",
        "description": "调用 OCR 自动识别合同要素，人工复核低置信度字段。",
        "order_index": 2,
        "sla_days": 3,
        "sla_text": "T+3 工作日完成入档复核",
        "checklist": [
            "检查 OCR 置信度低于 80% 的字段",
            "标记需补充的证书信息",
            "更新系统台账状态",
        ],
    },
    {
        "key": "probation",
        "name": "试用评估",
        "description": "跟踪试用期表现，完成评估表并提交转正建议。",
        "order_index": 3,
        "sla_days": 90,
        "sla_text": "入职后 90 天内完成试用评估",
        "checklist": [
            "收集授课反馈与课堂录播",
            "完成教学质量打分",
            "提交转正/延长试用建议",
        ],
        "reminders": [
            {
                "label": "试用期节点提醒",
                "offset_days": -15,
                "channels": ["email", "wechat"],
                "notes": "提醒填写评估表",
            },
            {
                "label": "试用到期提醒",
                "offset_days": -5,
                "channels": ["email"],
            },
        ],
    },
    {
        "key": "signature",
        "name": "合同签署",
        "description": "确认最终合同文本，完成电子签署并归档密存。",
        "order_index": 4,
        "sla_days": 5,
        "sla_text": "试用评估通过后 5 天内完成签署",
        "checklist": [
            "导出终版合同并水印",
            "触发电子签署流程",
            "加密上传至存储并归档",
        ],
    },
    {
        "key": "archive",
        "name": "复核归档",
        "description": "对合同资料进行最终复核与归档。",
        "order_index": 5,
        "sla_days": 7,
        "sla_text": "签署完成后一周内归档",
        "checklist": [
            "核对合同编号与归档信息",
            "同步系统台账状态",
            "更新归档日志",
        ],
    },
    {
        "key": "renewal",
        "name": "续签提醒",
        "description": "监控合同到期时间，提前发起续签提醒与跟进。",
        "order_index": 6,
        "sla_days": 90,
        "sla_text": "合同到期前 90 天发起续签提醒",
        "checklist": [
            "核对即将到期名单",
            "发送续签通知与确认表",
            "更新续签跟进状态",
        ],
        "reminders": [
            {
                "label": "续签 90 天提醒",
                "offset_days": -90,
                "channels": ["wechat"],
            },
            {
                "label": "续签 30 天提醒",
                "offset_days": -30,
                "channels": ["email", "sms"],
            },
            {
                "label": "续签 7 天提醒",
                "offset_days": -7,
                "channels": ["sms"],
            },
        ],
    },
]


class WorkflowService:
    ASSIGNEE_REQUIRED_PERMISSIONS = {"contracts.audit", "settings.manage"}

    @staticmethod
    def ensure_default_stages(db: Session) -> None:
        existing_keys = {
            key for (key,) in db.execute(select(WorkflowStage.key)).all()
        }
        created = False
        for stage_data in DEFAULT_STAGES:
            if stage_data["key"] in existing_keys:
                continue
            db_stage = WorkflowStage(
                key=stage_data["key"],
                name=stage_data["name"],
                description=stage_data.get("description"),
                order_index=stage_data["order_index"],
                sla_days=stage_data.get("sla_days"),
                sla_text=stage_data.get("sla_text"),
                checklist=stage_data.get("checklist", []),
                reminders=stage_data.get("reminders", []),
            )
            db.add(db_stage)
            created = True
        if created:
            db.flush()

    @staticmethod
    def _build_user_summary(user: User) -> SimpleUserSummary:
        permissions = get_user_permissions(user)
        return SimpleUserSummary(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            permissions=permissions,
        )

    @classmethod
    def get_assignable_users(cls, db: Session) -> List[SimpleUserSummary]:
        users = (
            db.query(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.is_active.is_(True))
            .all()
        )
        summaries: List[SimpleUserSummary] = []
        seen_ids: set[str] = set()

        for user in users:
            permissions = get_user_permissions(user)
            if user.is_superuser or cls.ASSIGNEE_REQUIRED_PERMISSIONS.intersection(permissions):
                if user.id in seen_ids:
                    continue
                summaries.append(
                    SimpleUserSummary(
                        id=user.id,
                        username=user.username,
                        full_name=user.full_name,
                        email=user.email,
                        permissions=permissions,
                    )
                )
                seen_ids.add(user.id)
        return sorted(summaries, key=lambda item: item.full_name or item.username)

    @classmethod
    def get_workflow_config(cls, db: Session) -> WorkflowConfigResponse:
        cls.ensure_default_stages(db)
        stages = (
            db.query(WorkflowStage)
            .options(selectinload(WorkflowStage.owner).selectinload(User.roles).selectinload(Role.permissions))
            .order_by(WorkflowStage.order_index.asc())
            .all()
        )

        stage_models: List[WorkflowStageRead] = []
        for stage in stages:
            owner_summary: Optional[SimpleUserSummary] = None
            if stage.owner:
                owner_summary = cls._build_user_summary(stage.owner)
            stage_models.append(
                WorkflowStageRead(
                    id=stage.id,
                    key=stage.key,
                    name=stage.name,
                    description=stage.description,
                    order_index=stage.order_index,
                    owner_id=stage.owner_id,
                    assistants=stage.assistants or [],  # 协助人列表
                    sla_days=stage.sla_days,
                    sla_text=stage.sla_text,
                    checklist=stage.checklist or [],
                    reminders=[ReminderConfig.model_validate(item) for item in (stage.reminders or [])],
                    is_active=stage.is_active,
                    owner=owner_summary,
                )
            )

        available_users = cls.get_assignable_users(db)
        return WorkflowConfigResponse(stages=stage_models, available_users=available_users)

    @staticmethod
    def update_workflow_stages(db: Session, updates: List[WorkflowStageUpdate]) -> None:
        if not updates:
            return

        keys = {item.key for item in updates}
        stage_map = {
            stage.key: stage
            for stage in db.query(WorkflowStage)
            .filter(WorkflowStage.key.in_(keys))
            .all()
        }

        for payload in updates:
            stage = stage_map.get(payload.key)
            if stage is None:
                continue
            if payload.owner_id is not None:
                stage.owner_id = payload.owner_id or None
            if payload.assistants is not None:
                stage.assistants = payload.assistants  # 更新协助人列表
            if payload.sla_days is not None:
                stage.sla_days = payload.sla_days
            if payload.sla_text is not None:
                stage.sla_text = payload.sla_text
            if payload.checklist is not None:
                stage.checklist = payload.checklist
            if payload.reminders is not None:
                stage.reminders = [rem.model_dump() for rem in payload.reminders]
            if payload.is_active is not None:
                stage.is_active = payload.is_active
        db.commit()
