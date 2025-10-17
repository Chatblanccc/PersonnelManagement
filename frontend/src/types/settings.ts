export interface WorkflowReminder {
  label: string
  offset_days: number
  channels: string[]
  notes?: string
}

export interface WorkflowAssignableUser {
  id: string
  username: string
  full_name?: string | null
  email?: string | null
  permissions: string[]
}

export interface WorkflowStageConfig {
  id: string
  key: string
  name: string
  description?: string | null
  order_index: number
  owner_id?: string | null
  assistants?: string[]  // 协助人用户ID列表
  owner?: WorkflowAssignableUser | null
  sla_days?: number | null
  sla_text?: string | null
  checklist: string[]
  reminders: WorkflowReminder[]
  is_active: boolean
}

export interface WorkflowConfigResponse {
  stages: WorkflowStageConfig[]
  available_users: WorkflowAssignableUser[]
}

export interface WorkflowStageUpdate {
  key: string
  owner_id?: string | null
  assistants?: string[]  // 协助人用户ID列表
  sla_days?: number | null
  sla_text?: string | null
  checklist?: string[]
  reminders?: WorkflowReminder[]
  is_active?: boolean
}

export interface WorkflowConfigUpdate {
  stages: WorkflowStageUpdate[]
}

