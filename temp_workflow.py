from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.workflow_service import WorkflowService
from app.models.workflow import WorkflowStage
from app.schemas.workflow import WorkflowStageUpdate

session: Session = SessionLocal()
WorkflowService.ensure_default_stages(session)
print('Before:', [(stage.key, stage.owner_id) for stage in session.query(WorkflowStage).all()])
update = WorkflowStageUpdate(key='entry', owner_id='a95dec8f-431e-4872-b71c-f4f5bb9df233')
WorkflowService.update_workflow_stages(session, [update])
session.close()
session = SessionLocal()
print('After:', [(stage.key, stage.owner_id) for stage in session.query(WorkflowStage).all()])
session.close()
