from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List, Tuple
from datetime import datetime, timedelta, timezone
import math

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
)
from app.utils.encryption import encrypt_field, decrypt_field, SENSITIVE_FIELDS
from app.services.approval_workflow_service import ApprovalWorkflowService

class ContractService:
    model = Contract
    """合同服务：处理业务逻辑"""
    
    @staticmethod
    def create_contract(db: Session, contract_data: ContractCreate) -> Contract:
        """创建合同记录"""
        # 准备数据
        data_dict = contract_data.model_dump()
        if not data_dict.get('approval_status'):
            data_dict['approval_status'] = 'pending'

        
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
    def update_contract(db: Session, contract_id: str, update_data: ContractUpdate) -> Optional[Contract]:
        """更新合同信息"""
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return None
        
        # 更新字段
        update_dict = update_data.model_dump(exclude_unset=True)
        
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

