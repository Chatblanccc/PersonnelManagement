"""操作日志相关路由"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.operation_log import OperationLogQuery, OperationLogResponse
from app.services.operation_log_service import OperationLogService
from app.utils.auth import require_permission


router = APIRouter(prefix="/operations", tags=["operations"], dependencies=[Depends(require_permission("contracts.audit"))])


@router.get("/logs", response_model=OperationLogResponse)
def list_operation_logs(
    query: OperationLogQuery = Depends(),
    db: Session = Depends(get_db),
):
    """分页获取操作日志"""

    logs, total = OperationLogService.query_logs(db, query)

    return OperationLogResponse(
        total=total,
        page=query.page,
        page_size=query.page_size,
        items=logs,
    )


