from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Tuple, Dict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import io
import math
import re

from app.models.contract import Contract
from app.models.contract_attachment import ContractAttachment
from app.models.contract_log import ContractLog
from app.models.contract_timeline import ContractTimeline
from app.models.approval import ApprovalTask
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractLifecycleResponse,
    ContractLifecycleSummary,
    ContractTimelineEventCreate,
    ContractTimelineEventUpdate,
)
from app.utils.encryption import encrypt_field, decrypt_field, SENSITIVE_FIELDS
from app.services.approval_workflow_service import ApprovalWorkflowService
from app.services.file_storage_service import file_storage_service
from app.utils.excel_import import FIELD_TO_LABEL
from app.utils.field_defaults import DEFAULT_FIELD_CONFIGS


FIELD_LABEL_MAP: Dict[str, str] = {
    **{item["key"]: item.get("label", item["key"]) for item in DEFAULT_FIELD_CONFIGS},
    **FIELD_TO_LABEL,
}


def _format_value_for_log(value: Optional[object]) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    return str(value)

class ContractService:
    model = Contract
    """合同服务：处理业务逻辑"""
    
    @staticmethod
    def create_contract(
        db: Session,
        contract_data: ContractCreate,
        *,
        operator: Optional[str] = None,
        original_filename: Optional[str] = None,
    ) -> Contract:
        """创建合同记录"""
        # 准备数据
        data_dict = contract_data.model_dump()
        if not data_dict.get('approval_status'):
            data_dict['approval_status'] = 'pending'

        ContractService._ensure_teaching_years(data_dict)

        # 检查员工工号是否已存在
        teacher_code = data_dict.get('teacher_code')
        if teacher_code:
            existing_contract = db.query(Contract).filter(Contract.teacher_code == teacher_code).first()
            if existing_contract:
                raise ValueError(f"员工工号 {teacher_code} 已存在，请检查是否重复录入")
        
        # 加密敏感字段
        for field in SENSITIVE_FIELDS:
            if field in data_dict and data_dict[field]:
                data_dict[field] = encrypt_field(str(data_dict[field]))
        
        # 创建记录
        db_contract = Contract(**data_dict)
        db.add(db_contract)
        db.flush()
        if data_dict.get('approval_status') == 'approved':
            db_contract.approval_completed_at = datetime.now(timezone.utc)
        else:
            db_contract.approval_completed_at = None

        should_create_workflow = data_dict.get('approval_status') in ('pending', 'in_progress')

        # 根据流程配置生成审批任务
        if should_create_workflow:
            ApprovalWorkflowService.create_workflow_for_contract(db, db_contract)

        log_detail = f"创建合同 {db_contract.name} ({db_contract.teacher_code})"
        log_changes = [
            {
                "field": field,
                "field_label": FIELD_LABEL_MAP.get(field, field),
                "before": None,
                "after": _format_value_for_log(data_dict.get(field)),
            }
            for field in ('teacher_code', 'name', 'department', 'job_status')
            if field in data_dict
        ]

        ContractService._append_contract_log(
            db,
            contract_id=db_contract.id,
            action="创建合同",
            operator=operator,
            detail=log_detail,
            changes=log_changes or None,
        )

        ContractService._add_timeline_entry(
            db,
            contract_id=db_contract.id,
            event_type='uploaded',
            title='创建合同',
            description=log_detail,
            operator=operator,
            extra_data={'approval_status': db_contract.approval_status},
            commit=False,
        )

        # 如果有原始文件，自动添加为附件
        if data_dict.get('file_url') and original_filename:
            attachment = ContractAttachment(
                contract_id=db_contract.id,
                name=original_filename,
                file_url=data_dict['file_url'],
                file_type=Path(original_filename).suffix.lstrip('.').lower() or 'unknown',
                uploader=operator,
            )
            db.add(attachment)
            
            ContractService._append_contract_log(
                db,
                contract_id=db_contract.id,
                action="添加合同原始文件",
                operator=operator,
                detail=f"自动添加原始合同文件：{original_filename}",
                changes=None,
            )

        db.commit()
        db.refresh(db_contract)
        
        # 解密敏感字段用于返回
        ContractService._decrypt_contract(db_contract)
        
        return db_contract
    
    @staticmethod
    def get_contract(db: Session, contract_id: str) -> Optional[Contract]:
        """获取单个合同"""
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if contract:
            ContractService._decrypt_contract(contract)
        return contract
    
    @staticmethod
    def get_contracts(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        department: Optional[str] = None,
        job_status: Optional[str] = None,
        search: Optional[str] = None,
        approval_status: Optional[str] = "approved",
        expiring_within_days: Optional[int] = None,
    ) -> tuple[List[Contract], int]:
        """
        获取合同列表（分页）
        返回：(合同列表, 总数)
        """
        query = db.query(Contract)

        if approval_status and approval_status != "all":
            query = query.filter(Contract.approval_status == approval_status)
        
        # ID 筛选优先
        # 部门筛选
        if department:
            query = query.filter(Contract.department == department)
        
        # 在职状态筛选
        if job_status:
            query = query.filter(Contract.job_status == job_status)
        
        # 搜索（姓名、工号、部门）
        if search:
            query = query.filter(
                or_(
                    Contract.name.contains(search),
                    Contract.teacher_code.contains(search),
                    Contract.department.contains(search),
                )
            )
        
        if expiring_within_days is not None:
            today = datetime.now().date()
            future_date = today + timedelta(days=expiring_within_days)
            active_statuses = ['在职', '试用期']

            query = query.filter(
                Contract.contract_end.isnot(None),
                Contract.contract_end >= today,
                Contract.contract_end <= future_date,
                Contract.job_status.in_(active_statuses),
            )

        # 计算总数
        total = query.count()
        
        # 分页
        contracts = (
            query.order_by(Contract.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        
        # 解密敏感字段
        for contract in contracts:
            ContractService._decrypt_contract(contract)
        
        return contracts, total
    
    @staticmethod
    def update_contract(
        db: Session,
        contract_id: str,
        update_data: ContractUpdate,
        *,
        operator: Optional[str] = None,
    ) -> Optional[Contract]:
        """更新合同信息"""
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return None
        
        # 更新字段
        update_dict = update_data.model_dump(exclude_unset=True)
        
        ContractService._ensure_teaching_years(
            update_dict,
            fallback_start=contract.start_work_date,
            fallback_entry=contract.entry_date,
        )

        before_values: Dict[str, Optional[str]] = {}
        for key, value in update_dict.items():
            original_value = getattr(contract, key, None)
            if key in SENSITIVE_FIELDS and original_value:
                try:
                    original_value = decrypt_field(original_value)
                except Exception:
                    pass
            before_values[key] = _format_value_for_log(original_value)

        # 检查员工工号是否与其他合同重复（排除当前合同）
        teacher_code = update_dict.get('teacher_code')
        if teacher_code and teacher_code != contract.teacher_code:
            existing_contract = db.query(Contract).filter(
                Contract.teacher_code == teacher_code,
                Contract.id != contract_id
            ).first()
            if existing_contract:
                raise ValueError(f"员工工号 {teacher_code} 已被其他合同使用，请检查是否重复")

        # 加密敏感字段
        for field in SENSITIVE_FIELDS:
            if field in update_dict and update_dict[field]:
                update_dict[field] = encrypt_field(str(update_dict[field]))
        
        for key, value in update_dict.items():
            setattr(contract, key, value)
        
        if 'approval_status' in update_dict:
            if update_dict['approval_status'] == 'approved':
                contract.approval_completed_at = datetime.now(timezone.utc)
            else:
                contract.approval_completed_at = None
        contract.updated_at = datetime.now()
        db.commit()
        db.refresh(contract)
        
        # 解密敏感字段
        ContractService._decrypt_contract(contract)

        changes_payload = []
        for key in update_dict.keys():
            before_val = before_values.get(key)
            after_val = _format_value_for_log(getattr(contract, key, None))
            if before_val == after_val:
                continue
            changes_payload.append({
                "field": key,
                "field_label": FIELD_LABEL_MAP.get(key, key),
                "before": before_val,
                "after": after_val,
            })

        if changes_payload:
            ContractService._append_contract_log(
                db,
                contract_id=contract_id,
                action="更新合同信息",
                operator=operator,
                detail=f"更新合同 {contract.name} ({contract.teacher_code})",
                changes=changes_payload,
            )
            db.commit()
            db.refresh(contract)
            ContractService._decrypt_contract(contract)
        
        return contract
    
    @staticmethod
    def delete_contract(db: Session, contract_id: str) -> bool:
        """删除合同"""
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return False
        
        db.delete(contract)
        db.commit()
        return True
    
    @staticmethod
    def get_contracts_for_export(
        db: Session,
        department: Optional[str] = None,
        job_status: Optional[str] = None,
        search: Optional[str] = None,
        ids: Optional[List[str]] = None,
        approval_status: Optional[str] = "approved",
    ) -> List[Contract]:
        """获取用于导出的合同列表（不分页）"""
        query = db.query(Contract)
        
        if ids:
            query = query.filter(Contract.id.in_(ids))

        if department:
            query = query.filter(Contract.department == department)

        if job_status:
            query = query.filter(Contract.job_status == job_status)

        if approval_status and approval_status != "all":
            query = query.filter(Contract.approval_status == approval_status)

        if search:
            query = query.filter(
                or_(
                    Contract.name.contains(search),
                    Contract.teacher_code.contains(search),
                    Contract.department.contains(search),
                )
            )
        
        contracts = query.all()
        
        # 解密敏感字段
        for contract in contracts:
            ContractService._decrypt_contract(contract)
        
        return contracts

    @staticmethod
    def get_contract_lifecycle(db: Session, contract_id: str) -> Optional[ContractLifecycleResponse]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return None

        timelines = (
            db.query(ContractTimeline)
            .filter(ContractTimeline.contract_id == contract_id)
            .order_by(ContractTimeline.created_at.asc())
            .all()
        )

        attachments = (
            db.query(ContractAttachment)
            .filter(ContractAttachment.contract_id == contract_id)
            .order_by(ContractAttachment.uploaded_at.desc())
            .all()
        )

        logs = (
            db.query(ContractLog)
            .filter(ContractLog.contract_id == contract_id)
            .order_by(ContractLog.created_at.desc())
            .all()
        )

        summary = ContractService._build_lifecycle_summary(contract, timelines, attachments, logs)

        return ContractLifecycleResponse(
            contract=contract,
            timeline=timelines,
            attachments=attachments,
            logs=logs,
            summary=summary,
        )

    @staticmethod
    def add_timeline_event(
        db: Session,
        contract_id: str,
        payload: ContractTimelineEventCreate,
        *,
        actor: Optional[str] = None,
    ) -> Optional[ContractTimeline]:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return None

        event = ContractTimeline(
            contract_id=contract_id,
            event_type=payload.event_type,
            title=payload.title,
            description=payload.description,
            operator=payload.operator or actor,
            extra_data=payload.extra_data or {},
        )
        db.add(event)

        ContractService._append_contract_log(
            db,
            contract_id=contract_id,
            action="新增生命周期事件",
            operator=actor,
            detail=f"添加事件：{payload.title}",
            changes=[
                {
                    "field": "timeline",
                    "field_label": "合同生命周期",
                    "before": None,
                    "after": payload.title,
                }
            ],
        )

        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def update_timeline_event(
        db: Session,
        contract_id: str,
        event_id: str,
        payload: ContractTimelineEventUpdate,
        *,
        actor: Optional[str] = None,
    ) -> Optional[ContractTimeline]:
        event = (
            db.query(ContractTimeline)
            .filter(ContractTimeline.id == event_id, ContractTimeline.contract_id == contract_id)
            .first()
        )
        if not event:
            return None

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return event

        changes = []
        if 'event_type' in updates and updates['event_type'] != event.event_type:
            changes.append({
                "field": "event_type",
                "field_label": "事件类型",
                "before": event.event_type,
                "after": updates['event_type'],
            })
        if 'title' in updates and updates['title'] != event.title:
            changes.append({
                "field": "title",
                "field_label": "事件标题",
                "before": event.title,
                "after": updates['title'],
            })
        if 'description' in updates and updates['description'] != event.description:
            changes.append({
                "field": "description",
                "field_label": "事件描述",
                "before": event.description,
                "after": updates['description'],
            })

        for key, value in updates.items():
            if key == 'extra_data' and value is not None:
                event.extra_data = value
            elif value is not None:
                setattr(event, key, value)

        if actor:
            event.operator = event.operator or actor

        db.commit()
        db.refresh(event)

        if changes:
            ContractService._append_contract_log(
                db,
                contract_id=contract_id,
                action="更新生命周期事件",
                operator=actor,
                detail=f"更新事件：{event.title}",
                changes=changes,
            )
            db.commit()

        return event

    @staticmethod
    def delete_timeline_event(
        db: Session,
        contract_id: str,
        event_id: str,
        *,
        actor: Optional[str] = None,
    ) -> bool:
        event = (
            db.query(ContractTimeline)
            .filter(ContractTimeline.id == event_id, ContractTimeline.contract_id == contract_id)
            .first()
        )
        if not event:
            return False

        title = event.title
        db.delete(event)
        db.commit()

        ContractService._append_contract_log(
            db,
            contract_id=contract_id,
            action="删除生命周期事件",
            operator=actor,
            detail=f"删除事件：{title}",
            changes=[
                {
                    "field": "timeline",
                    "field_label": "合同生命周期",
                    "before": title,
                    "after": None,
                }
            ],
        )
        db.commit()
        return True

    @staticmethod
    def add_attachment(
        db: Session,
        contract_id: str,
        *,
        filename: str,
        content: bytes,
        uploader: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> Optional[ContractAttachment]:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return None

        if not content:
            raise ValueError("附件内容为空")

        suffix = Path(filename).suffix.lstrip('.')
        storage_meta = file_storage_service.save_encrypted(io.BytesIO(content), filename)

        attachment = ContractAttachment(
            contract_id=contract_id,
            name=filename,
            file_url=storage_meta.relative_path,
            file_type=(suffix or (content_type or 'unknown')).lower(),
            uploader=uploader,
        )

        db.add(attachment)
        ContractService._append_contract_log(
            db,
            contract_id=contract_id,
            action="上传合同附件",
            operator=uploader,
            detail=f"上传附件：{filename}",
        )

        db.commit()
        db.refresh(attachment)
        return attachment

    @staticmethod
    def delete_attachment(
        db: Session,
        contract_id: str,
        attachment_id: str,
        *,
        actor: Optional[str] = None,
    ) -> bool:
        attachment = (
            db.query(ContractAttachment)
            .filter(ContractAttachment.id == attachment_id, ContractAttachment.contract_id == contract_id)
            .first()
        )
        if not attachment:
            return False

        file_path = attachment.file_url
        name = attachment.name

        db.delete(attachment)
        db.commit()

        try:
            file_storage_service.delete(file_path)
        except Exception:
            pass

        ContractService._append_contract_log(
            db,
            contract_id=contract_id,
            action="删除合同附件",
            operator=actor,
            detail=f"删除附件：{name}",
            changes=[
                {
                    "field": "attachments",
                    "field_label": "合同附件",
                    "before": name,
                    "after": None,
                }
            ],
        )
        db.commit()
        return True

    @staticmethod
    def get_attachment_content(
        db: Session,
        contract_id: str,
        attachment_id: str,
    ) -> Optional[tuple[ContractAttachment, bytes]]:
        attachment = (
            db.query(ContractAttachment)
            .filter(ContractAttachment.id == attachment_id, ContractAttachment.contract_id == contract_id)
            .first()
        )
        if not attachment:
            return None

        data = file_storage_service.load_decrypted(attachment.file_url)
        return attachment, data

    @staticmethod
    def _build_lifecycle_summary(
        contract: Contract,
        timelines: List[ContractTimeline],
        attachments: List[ContractAttachment],
        logs: List[ContractLog],
    ) -> ContractLifecycleSummary:
        pending_fields: List[str] = []
        warnings: List[str] = []
        next_action: Optional[dict] = None

        if contract.ocr_confidence and contract.ocr_confidence < 0.8:
            pending_fields.extend(["id_number", "phone_number", "address"])

        if contract.contract_end:
            days_left = (contract.contract_end - datetime.now().date()).days
            if days_left <= 0:
                warnings.append("合同已到期，请尽快处理续签或离职手续")
            elif days_left <= 30:
                next_action = {
                    "type": "renewal",
                    "label": "提醒续签",
                    "days_left": days_left,
                    "message": f"合同将在 {days_left} 天后到期，请提前安排续签流程",
                }

        if contract.job_status and contract.job_status not in ("在职", "试用期"):
            warnings.append(f"当前合同状态为 {contract.job_status}，请确认是否需要终止流程")

        return ContractLifecycleSummary(
            nextAction=next_action or {"type": "none"},
            pendingReviewFields=list(set(pending_fields)) or None,
            warnings=warnings or None,
        )
    
    @staticmethod
    def get_expiring_contracts(db: Session, days: int = 30) -> List[Contract]:
        """获取即将到期的合同"""
        today = datetime.now().date()
        future_date = today + timedelta(days=days)
        
        active_statuses = ['在职', '试用期']

        contracts = db.query(Contract).filter(
            and_(
                Contract.contract_end >= today,
                Contract.contract_end <= future_date,
                Contract.job_status.in_(active_statuses),
                Contract.approval_status == "approved",
            )
        ).all()
        
        for contract in contracts:
            ContractService._decrypt_contract(contract)
        
        return contracts

    @staticmethod
    def get_dashboard_breakdown(db: Session) -> dict:
        """获取仪表盘子项统计数据"""
        from sqlalchemy import func, case
        from app.models.approval import ApprovalTask

        # 教师总数拆分：尝试按照职务识别专任/外聘
        total_teachers = db.query(func.count(Contract.id)).filter(Contract.approval_status == "approved").scalar() or 0

        regular_teachers = db.query(func.count(Contract.id)).filter(
            Contract.approval_status == "approved",
            Contract.job_status == '在职',
            func.lower(func.coalesce(Contract.position, ''))
            .notlike('%外聘%')
        ).scalar() or 0

        part_time_teachers = total_teachers - regular_teachers

        # 试用期教师
        probation_teachers = db.query(func.count(Contract.id)).filter(
            Contract.approval_status == "approved",
            func.lower(Contract.job_status) == '试用期'
        ).scalar() or 0

        expiring_30 = ContractService.get_expiring_contracts(db, days=30)
        expiring_30_count = len(expiring_30)
        expiring_contracts = len(ContractService.get_expiring_contracts(db, days=90))

        # OCR 相关统计
        average_confidence = db.query(func.avg(Contract.ocr_confidence)).filter(Contract.approval_status == "approved").scalar() or 0.0
        
        # 待复核：统计仍在流程中的审批任务数量（pending 或 in_progress）
        pending_tasks = db.query(ApprovalTask.contract_id).filter(
            ApprovalTask.status.in_(['pending', 'in_progress'])
        ).all()

        contract_ids = {task.contract_id for task in pending_tasks if task.contract_id}
        if contract_ids:
            pending_contracts = db.query(func.count(Contract.id)).filter(Contract.id.in_(contract_ids)).scalar() or 0
        else:
            pending_contracts = 0

        return {
            'totalTeachersBreakdown': {
                'regular': regular_teachers,
                'partTime': part_time_teachers,
            },
            'probationTeachers': probation_teachers,
            'expiringWithin90Days': expiring_contracts,
            'averageConfidence': average_confidence,
            'pendingReview': pending_contracts,
            'sidebarSummary': {
                'pendingReview': pending_contracts,
                'probationTeachers': probation_teachers,
                'expiringWithin30Days': expiring_30_count,
                'expiringWithin90Days': expiring_contracts,
                'averageConfidence': average_confidence,
            }
        }
    
    @staticmethod
    def _decrypt_contract(contract: Contract):
        """解密合同中的敏感字段"""
        for field in SENSITIVE_FIELDS:
            value = getattr(contract, field, None)
            if value:
                try:
                    setattr(contract, field, decrypt_field(value))
                except:
                    pass  # 如果解密失败，保持原值

    @staticmethod
    def _append_contract_log(
        db: Session,
        *,
        contract_id: str,
        action: str,
        operator: Optional[str] = None,
        detail: Optional[str] = None,
        changes: Optional[List[Dict[str, Optional[str]]]] = None,
    ) -> None:
        log = ContractLog(
            contract_id=contract_id,
            action=action,
            operator=operator,
            detail=detail,
            changes=changes or [],
        )
        db.add(log)

    @staticmethod
    def _add_timeline_entry(
        db: Session,
        *,
        contract_id: str,
        event_type: str,
        title: str,
        description: Optional[str] = None,
        operator: Optional[str] = None,
        extra_data: Optional[Dict[str, object]] = None,
        commit: bool = True,
    ) -> ContractTimeline:
        event = ContractTimeline(
            contract_id=contract_id,
            event_type=event_type,
            title=title,
            description=description,
            operator=operator,
            extra_data=extra_data or {},
        )
        db.add(event)
        if commit:
            db.commit()
            db.refresh(event)
        return event

    @classmethod
    def _ensure_teaching_years(
        cls,
        data: dict,
        fallback_start: Optional[date] = None,
        fallback_entry: Optional[date] = None,
    ) -> None:
        if 'teaching_years' in data and data['teaching_years'] not in (None, 0):
            return

        if 'start_work_date' in data:
            reference = data.get('start_work_date')
        else:
            reference = fallback_start

        if not reference:
            if 'entry_date' in data:
                reference = data.get('entry_date')
            else:
                reference = fallback_entry

        normalized = cls._normalize_date(reference)
        if not normalized:
            return

        data['teaching_years'] = cls._calculate_years(normalized)

    @staticmethod
    def _normalize_date(value: Optional[date | datetime | str]) -> Optional[date]:
        if value is None:
            return None
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError:
                return None
        return None

    @staticmethod
    def _calculate_years(reference: date) -> int:
        today = datetime.now().date()
        years = today.year - reference.year
        if (today.month, today.day) < (reference.month, reference.day):
            years -= 1
        return max(years, 0)

