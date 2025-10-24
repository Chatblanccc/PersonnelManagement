from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.workflow import WorkflowConfigResponse, WorkflowConfigUpdate
from app.schemas.field_config import (
    FieldConfigResponse,
    FieldConfigCreate,
    FieldConfigUpdate,
    FieldConfigCollection,
)
from app.services.field_config_service import FieldConfigService
from app.utils.excel_export import ExcelExporter
from app.services.workflow_service import WorkflowService
from app.utils.auth import require_permission, require_any_permission

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
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


@router.get("/fields", response_model=FieldConfigCollection)
def list_field_configs(db: Session = Depends(get_db)) -> FieldConfigCollection:
    items = FieldConfigService.list_configs(db)
    return FieldConfigCollection(items=items)


@router.post("/fields", response_model=FieldConfigResponse)
def create_field_config(payload: FieldConfigCreate, db: Session = Depends(get_db)) -> FieldConfigResponse:
    try:
        config = FieldConfigService.create_config(db, payload)
    except ValueError as exc:  # pragma: no cover - simple error handling
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return config


@router.patch("/fields/{key}", response_model=FieldConfigResponse)
def update_field_config(key: str, payload: FieldConfigUpdate, db: Session = Depends(get_db)) -> FieldConfigResponse:
    try:
        config = FieldConfigService.update_config(db, key, payload)
    except ValueError as exc:  # pragma: no cover
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return config


@router.delete("/fields/{key}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_field_config(key: str, db: Session = Depends(get_db)) -> Response:
    try:
        FieldConfigService.delete_config(db, key)
    except ValueError as exc:  # pragma: no cover
        status_code = 400 if "Built-in" in str(exc) else 404
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/fields/export")
def export_field_configs(db: Session = Depends(get_db)) -> StreamingResponse:
    field_pairs = FieldConfigService.export_field_pairs(db)
    excel_bytes = ExcelExporter.generate_template(field_pairs)
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=field-config-template.xlsx",
        },
    )

