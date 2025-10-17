from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ContractTimeline(Base):
    __tablename__ = "contract_timelines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    operator = Column(String(50))
    extra_data = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="timelines")

