from __future__ import annotations

import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ContractFieldConfig(Base):
    __tablename__ = "contract_field_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(60), unique=True, nullable=False, index=True)
    label = Column(String(120), nullable=False)
    group = Column(String(50), nullable=False)
    type = Column(String(20), nullable=False, default="text")
    width = Column(Integer)
    order_index = Column(Integer, nullable=False, default=1000)
    editable = Column(Boolean, default=True)
    required = Column(Boolean, default=False)
    fixed = Column(Boolean, default=False)
    options = Column(JSON)
    description = Column(String(255))
    is_custom = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ContractFieldConfig(key={self.key}, label={self.label})>"

