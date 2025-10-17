from sqlalchemy import Column, String, Integer, Float, Date, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Contract(Base):
    __tablename__ = "contracts"

    # 主键
    id = Column(String(36), primary_key=True, default=generate_uuid)

    # 基础信息
    teacher_code = Column(String(20), nullable=False, unique=True, index=True)
    department = Column(String(50))
    name = Column(String(50), nullable=False, index=True)
    position = Column(String(50))
    gender = Column(String(10))
    age = Column(Integer)
    nation = Column(String(20))
    political_status = Column(String(20))
    id_number = Column(String(500))  # 加密存储，所以需要更长的字段
    birthplace = Column(String(50))

    # 合同信息
    entry_date = Column(Date)
    regular_date = Column(Date)
    contract_start = Column(Date)
    contract_end = Column(Date, index=True)
    job_status = Column(String(20), default='在职', index=True)
    approval_status = Column(String(20), default='pending', index=True)
    approval_completed_at = Column(DateTime(timezone=True))
    resign_date = Column(Date)

    # 联系方式（加密）
    phone_number = Column(String(500))  # 加密存储
    address = Column(String(500))  # 加密存储
    emergency_contact = Column(String(50))
    emergency_phone = Column(String(500))  # 加密存储

    # 教育信息
    education = Column(String(50))
    graduation_school = Column(String(100))
    diploma_no = Column(String(50))
    graduation_date = Column(Date)
    major = Column(String(100))
    degree = Column(String(50))
    degree_no = Column(String(50))

    # 资格信息
    teacher_cert_type = Column(String(50))
    teacher_cert_no = Column(String(50))
    title_rank = Column(String(50))
    title_cert_no = Column(String(50))
    title_cert_date = Column(Date)
    psychology_cert = Column(String(50))
    certificate_type = Column(String(50))
    mandarin_level = Column(String(50))

    # 工作信息
    start_work_date = Column(Date)
    teaching_years = Column(Integer, default=0)
    teaching_grade = Column(String(50))
    teaching_subject = Column(String(50))
    last_work = Column(String(100))

    # 其他
    remarks = Column(Text)
    file_url = Column(Text)  # 合同文件路径
    ocr_confidence = Column(Float, default=0.0)  # 平均置信度

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    attachments = relationship(
        "ContractAttachment",
        back_populates="contract",
        cascade="all, delete-orphan",
        lazy="joined"
    )
    timelines = relationship(
        "ContractTimeline",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="ContractTimeline.created_at",
        lazy="joined"
    )
    logs = relationship(
        "ContractLog",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="ContractLog.created_at",
        lazy="joined"
    )

    def __repr__(self):
        return f"<Contract(id={self.id}, name={self.name}, teacher_code={self.teacher_code})>"

