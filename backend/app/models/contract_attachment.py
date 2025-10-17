from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ContractAttachment(Base):
    __tablename__ = "contract_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(20), nullable=False)
    uploader = Column(String(50))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="attachments")

