from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ContractLog(Base):
    __tablename__ = "contract_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    operator = Column(String(50))
    detail = Column(Text)
    changes = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="logs")

