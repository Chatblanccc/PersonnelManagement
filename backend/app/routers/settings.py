from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.workflow import WorkflowConfigResponse, WorkflowConfigUpdate
from app.services.workflow_service import WorkflowService
from app.utils.auth import require_permission

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(require_permission("settings.manage"))],
)


@router.get("/workflow", response_model=WorkflowConfigResponse)
def get_workflow_configuration(db: Session = Depends(get_db)) -> WorkflowConfigResponse:
    return WorkflowService.get_workflow_config(db)


@router.put("/workflow", response_model=WorkflowConfigResponse)
def update_workflow_configuration(
    payload: WorkflowConfigUpdate,
    db: Session = Depends(get_db),
) -> WorkflowConfigResponse:
    WorkflowService.update_workflow_stages(db, payload.stages)
    return WorkflowService.get_workflow_config(db)

