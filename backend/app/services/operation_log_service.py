"""操作日志服务"""
from __future__ import annotations

import logging
from typing import Any, Optional, Tuple, List

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.operation_log import OperationLog
from app.models.user import User
from app.schemas.operation_log import OperationLogQuery


logger = logging.getLogger("app.operation_log")


class OperationLogService:
    """提供操作日志记录与查询能力"""

    @staticmethod
    def log(
        db: Session,
        *,
        module: str,
        action: str,
        summary: str,
        operator: Optional[User] = None,
        detail: Optional[str] = None,
        request: Optional[Request] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        extra: Optional[dict[str, Any]] = None,
    ) -> Optional[OperationLog]:
        """记录一条操作日志。失败时吞掉异常并写入标准日志，避免影响主流程。"""

        try:
            log = OperationLog(
                module=module,
                action=action,
                summary=(summary or "")[:255],
                detail=detail,
                target_type=target_type,
                target_id=target_id,
                target_name=target_name,
            )

            if operator is not None:
                log.operator_id = operator.id
                log.operator_username = operator.username
                log.operator_name = operator.full_name or operator.username

            if request is not None:
                client_host = request.client.host if request.client else None
                log.ip_address = client_host
                log.user_agent = request.headers.get("user-agent")
                log.request_method = request.method
                log.request_path = request.url.path
                log.query_params = request.url.query or None

            if extra:
                log.extra = jsonable_encoder(extra)

            db.add(log)
            db.commit()
            db.refresh(log)
            return log
        except Exception:  # pragma: no cover - 防止日志异常影响主流程
            db.rollback()
            logger.exception("记录操作日志失败", exc_info=True)
            return None

    @staticmethod
    def query_logs(
        db: Session,
        query: OperationLogQuery,
    ) -> Tuple[List[OperationLog], int]:
        """根据条件分页查询操作日志"""

        stmt = db.query(OperationLog)

        if query.module:
            stmt = stmt.filter(OperationLog.module == query.module)
        if query.action:
            stmt = stmt.filter(OperationLog.action == query.action)
        if query.operator:
            keyword = f"%{query.operator}%"
            stmt = stmt.filter(
                or_(
                    OperationLog.operator_username.ilike(keyword),
                    OperationLog.operator_name.ilike(keyword),
                )
            )
        if query.start_time:
            stmt = stmt.filter(OperationLog.created_at >= query.start_time)
        if query.end_time:
            stmt = stmt.filter(OperationLog.created_at <= query.end_time)

        stmt = stmt.order_by(OperationLog.created_at.desc())

        total = stmt.count()
        items = (
            stmt.offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
            .all()
        )

        return items, total


