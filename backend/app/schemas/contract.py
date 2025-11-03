from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime

# 基础 Schema
class ContractBase(BaseModel):
    teacher_code: str
    department: Optional[str] = None
    name: str
    position: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    nation: Optional[str] = None
    political_status: Optional[str] = None
    id_number: Optional[str] = None
    birthplace: Optional[str] = None
    entry_date: Optional[date] = None
    regular_date: Optional[date] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    job_status: Optional[str] = '在职'
    resign_date: Optional[date] = None
    phone_number: Optional[str] = None
    education: Optional[str] = None
    graduation_school: Optional[str] = None
    diploma_no: Optional[str] = None
    graduation_date: Optional[date] = None
    major: Optional[str] = None
    degree: Optional[str] = None
    degree_no: Optional[str] = None
    teacher_cert_type: Optional[str] = None
    teacher_cert_no: Optional[str] = None
    title_rank: Optional[str] = None
    title_cert_no: Optional[str] = None
    title_cert_date: Optional[date] = None
    start_work_date: Optional[date] = None
    teaching_years: Optional[int] = 0
    psychology_cert: Optional[str] = None
    certificate_type: Optional[str] = None
    teaching_grade: Optional[str] = None
    teaching_subject: Optional[str] = None
    last_work: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    mandarin_level: Optional[str] = None
    remarks: Optional[str] = None
    file_url: Optional[str] = None
    ocr_confidence: Optional[float] = 0.0

# 创建 Schema
class ContractCreate(ContractBase):
    approval_status: Optional[str] = 'pending'

# 更新 Schema（所有字段可选）
class ContractUpdate(BaseModel):
    teacher_code: Optional[str] = None
    department: Optional[str] = None
    name: Optional[str] = None
    position: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    nation: Optional[str] = None
    political_status: Optional[str] = None
    id_number: Optional[str] = None
    birthplace: Optional[str] = None
    entry_date: Optional[date] = None
    regular_date: Optional[date] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    job_status: Optional[str] = None
    resign_date: Optional[date] = None
    phone_number: Optional[str] = None
    education: Optional[str] = None
    graduation_school: Optional[str] = None
    diploma_no: Optional[str] = None
    graduation_date: Optional[date] = None
    major: Optional[str] = None
    degree: Optional[str] = None
    degree_no: Optional[str] = None
    teacher_cert_type: Optional[str] = None
    teacher_cert_no: Optional[str] = None
    title_rank: Optional[str] = None
    title_cert_no: Optional[str] = None
    title_cert_date: Optional[date] = None
    start_work_date: Optional[date] = None
    teaching_years: Optional[int] = None
    psychology_cert: Optional[str] = None
    certificate_type: Optional[str] = None
    teaching_grade: Optional[str] = None
    teaching_subject: Optional[str] = None
    last_work: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    mandarin_level: Optional[str] = None
    remarks: Optional[str] = None
    ocr_confidence: Optional[float] = None
    approval_status: Optional[str] = None

# 响应 Schema
class ContractResponse(ContractBase):
    id: str
    approval_status: str
    approval_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractTimelineEvent(BaseModel):
    id: str
    event_type: str
    title: str
    description: Optional[str] = None
    operator: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ContractTimelineEventCreate(BaseModel):
    event_type: str
    title: str
    description: Optional[str] = None
    operator: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None


class ContractTimelineEventUpdate(BaseModel):
    event_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None


class ContractAttachmentItem(BaseModel):
    id: str
    name: str
    file_url: str
    file_type: str
    uploader: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ContractLogChangeItem(BaseModel):
    field: str
    field_label: str
    before: Optional[str] = None
    after: Optional[str] = None


class ContractLogItem(BaseModel):
    id: str
    action: str
    operator: Optional[str] = None
    detail: Optional[str] = None
    changes: Optional[List[ContractLogChangeItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ContractLifecycleSummary(BaseModel):
    nextAction: Optional[dict[str, Any]] = None
    pendingReviewFields: Optional[List[str]] = None
    warnings: Optional[List[str]] = None


class ContractLifecycleResponse(BaseModel):
    contract: ContractResponse
    timeline: List[ContractTimelineEvent]
    attachments: List[ContractAttachmentItem]
    logs: List[ContractLogItem]
    summary: Optional[ContractLifecycleSummary] = None


class ContractLifecycleRefreshResponse(BaseModel):
    timeline: List[ContractTimelineEvent]
    attachments: List[ContractAttachmentItem]
    logs: List[ContractLogItem]
    summary: Optional[ContractLifecycleSummary] = None

# 分页响应
class PaginatedResponse(BaseModel):
    data: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class ContractQuery(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    department: Optional[str] = None
    job_status: Optional[str] = None
    search: Optional[str] = None
    ids: Optional[List[str]] = None
    approval_status: Optional[str] = 'approved'

# OCR 结果
class OcrResult(BaseModel):
    contract: dict
    confidence: dict[str, float]
    raw_text: str
    low_confidence_fields: list[str] = Field(default_factory=list)
    original_filename: Optional[str] = None


class ContractTemplate(BaseModel):
    headers: list[str]
