export type ContractApprovalStatus = 'pending' | 'in_progress' | 'approved' | 'returned'

// 合同数据类型定义
export interface Contract {
  id: string
  teacher_code: string
  department: string
  name: string
  position: string
  gender: string
  age: number
  nation: string
  political_status: string
  id_number: string
  birthplace: string
  entry_date: string | null
  regular_date: string | null
  contract_start: string | null
  contract_end: string | null
  job_status: string
  approval_status: ContractApprovalStatus
  approval_completed_at: string | null
  resign_date: string | null
  phone_number: string
  education: string
  graduation_school: string
  diploma_no: string
  graduation_date: string | null
  major: string
  degree: string
  degree_no: string
  teacher_cert_type: string
  teacher_cert_no: string
  title_rank: string
  title_cert_no: string
  title_cert_date: string | null
  start_work_date: string | null
  teaching_years: number
  psychology_cert: string
  certificate_type: string
  teaching_grade: string
  teaching_subject: string
  last_work: string
  address: string
  emergency_contact: string
  emergency_phone: string
  mandarin_level: string
  remarks: string
  file_url: string
  ocr_confidence: number
  created_at: string
  updated_at: string
}

export interface ContractTimelineEvent {
  id: string
  type:
    | 'uploaded'
    | 'ocr_completed'
    | 'reviewed'
    | 'entry'
    | 'regularized'
    | 'renewal'
    | 'change'
    | 'termination'
    | 'note'
    | 'other'
  title: string
  description?: string
  operator?: string
  created_at: string
  extra_data?: Record<string, any>
}

export interface ContractAttachment {
  id: string
  name: string
  file_url: string
  file_type: string
  uploaded_at: string
  uploader?: string
}

export interface ContractLogItem {
  id: string
  action: string
  operator?: string
  created_at: string
  detail?: string
  changes?: Array<{
    field: string
    field_label: string
    before?: string | null
    after?: string | null
  }>
}

export interface ContractLifecycleDetail {
  contract: Contract
  timeline: ContractTimelineEvent[]
  attachments: ContractAttachment[]
  logs: ContractLogItem[]
  summary?: ContractLifecycleSummary
}

export interface ContractLifecycleSummary {
  nextAction?: {
    type: 'renewal' | 'review' | 'termination' | 'none'
    due_date?: string
    days_left?: number
    message?: string
    label?: string
  }
  pendingReviewFields?: string[]
  warnings?: string[]
}

// OCR 识别结果
export interface OcrResult {
  contract: Partial<Contract>
  confidence: Record<string, number>
  raw_text: string
}

// 字段置信度
export interface FieldConfidence {
  field: string
  value: string
  confidence: number
  isLowConfidence: boolean
}

// 查询参数
export interface ContractQuery {
  page?: number
  page_size?: number
  department?: string
  job_status?: string
  search?: string
  ids?: string[]
  approval_status?: ContractApprovalStatus | "all"
  expiring_within_days?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStats {
  totalTeachers: number
  activeContracts: number
  expiringSoon: number
  pendingReview: number
  averageConfidence: number
  breakdown: {
    totalTeachersBreakdown: {
      regular: number
      partTime: number
    }
    probationTeachers: number
    expiringWithin90Days: number
    averageConfidence: number
    pendingReview: number
  }
  sidebarSummary?: SidebarSummary
}

export interface SidebarSummary {
  pendingReview: number
  probationTeachers: number
  expiringWithin30Days: number
  expiringWithin90Days: number
  averageConfidence: number
}

export type ApprovalStatus = 'pending' | 'in_progress' | 'completed' | 'returned'

export type ApprovalPriority = 'high' | 'medium' | 'low'

export type ApprovalStageKey =
  | 'entry'
  | 'qualification'
  | 'probation'
  | 'signature'
  | 'renewal'
  | 'archive'

export interface ApprovalChecklistItem {
  label: string
  completed: boolean
}

export interface ApprovalTask {
  id: string
  contract_id: string
  teacher_name: string
  department: string
  stage: ApprovalStageKey
  status: ApprovalStatus
  priority: ApprovalPriority
  owner: string
  assignees: string[]
  due_date: string
  created_at: string
  updated_at: string
  check_items: ApprovalChecklistItem[]
  remarks?: string
  latest_action?: string
}

export interface ApprovalTaskQuery {
  status?: ApprovalStatus | 'all'
  stage?: ApprovalStageKey | 'all'
  keyword?: string
  page?: number
  page_size?: number
  filter_by_user?: boolean
}

export interface ApprovalTaskListResponse extends PaginatedResponse<ApprovalTask> {}

export interface ApprovalStatsOverview {
  pending: number
  in_progress: number
  completed: number
  returned: number
}

export interface ApprovalStageSummary {
  stage: ApprovalStageKey
  total: number
  pending: number
  completed: number
  overdue: number
}

export interface ApprovalHistoryRecord {
  id: string
  task_id: string
  action: string
  operator: string
  created_at: string
  comment?: string
}

export interface ApprovalActionPayload {
  comment?: string
}

export interface ApprovalActionResponse {
  task: ApprovalTask
}


