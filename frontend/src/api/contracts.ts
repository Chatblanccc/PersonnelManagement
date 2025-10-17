import apiClient from './client'
import type {
  Contract,
  ContractQuery,
  PaginatedResponse,
  OcrResult,
  DashboardStats,
  SidebarSummary,
  ContractLifecycleDetail,
  ApprovalTaskListResponse,
  ApprovalTaskQuery,
  ApprovalStatsOverview,
  ApprovalStageSummary,
  ApprovalHistoryRecord,
  ApprovalActionPayload,
  ApprovalActionResponse,
} from '@/types/contract'

export interface ImportContractsResponse {
  imported: number
  created: number
  updated: number
  errors: string[]
}

export const getContracts = async (query: ContractQuery): Promise<PaginatedResponse<Contract>> => {
  return apiClient.get('/contracts', { params: query })
}

export const getContract = async (id: string): Promise<Contract> => {
  return apiClient.get(`/contracts/${id}`)
}

export const getContractLifecycle = async (id: string): Promise<ContractLifecycleDetail> => {
  if (!id) {
    throw new Error('Contract ID is required to fetch lifecycle data')
  }
  return apiClient.get(`/contracts/${id}/lifecycle`)
}

export const updateContract = async (id: string, data: Partial<Contract>): Promise<Contract> => {
  return apiClient.patch(`/contracts/${id}`, data)
}

export const deleteContract = async (id: string): Promise<void> => {
  return apiClient.delete(`/contracts/${id}`)
}

export const exportContracts = async (query: ContractQuery): Promise<Blob> => {
  return apiClient.get('/contracts/export', {
    params: query,
    responseType: 'blob',
  })
}

export const downloadTemplate = async (): Promise<Blob> => {
  return apiClient.get('/contracts/template', {
    responseType: 'blob',
  })
}

export const importContracts = async (file: File): Promise<ImportContractsResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post('/contracts/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const uploadContract = async (file: File): Promise<OcrResult> => {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post('/contracts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const createContract = async (data: Partial<Contract>): Promise<Contract> => {
  return apiClient.post('/contracts', data)
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return apiClient.get('/contracts/stats/dashboard')
}

export const getDashboardSummary = async (): Promise<SidebarSummary> => {
  return apiClient.get('/contracts/stats/dashboard/summary')
}

export const getApprovalTasks = async (query: ApprovalTaskQuery): Promise<ApprovalTaskListResponse> => {
  return apiClient.get('/approvals/tasks', { params: query })
}

export const getApprovalStatsOverview = async (): Promise<ApprovalStatsOverview> => {
  return apiClient.get('/approvals/stats/overview')
}

export const getApprovalStageSummary = async (): Promise<ApprovalStageSummary[]> => {
  return apiClient.get('/approvals/stats/stages')
}

export const getApprovalHistory = async (taskId: string): Promise<ApprovalHistoryRecord[]> => {
  return apiClient.get(`/approvals/tasks/${taskId}/history`)
}

export const approveApprovalTask = async (
  taskId: string,
  payload?: ApprovalActionPayload,
): Promise<ApprovalActionResponse> => {
  return apiClient.post(`/approvals/tasks/${taskId}/approve`, payload ?? {})
}

export const returnApprovalTask = async (
  taskId: string,
  payload?: ApprovalActionPayload,
): Promise<ApprovalActionResponse> => {
  return apiClient.post(`/approvals/tasks/${taskId}/return`, payload ?? {})
}

export const deleteApprovalTask = async (taskId: string): Promise<{ message: string; task_id: string }> => {
  return apiClient.delete(`/approvals/tasks/${taskId}`)
}

export interface DeleteAllTasksResponse {
  message: string
  deleted_count: number
  contract_id?: string
  teacher_name?: string
  department?: string
}

export const deleteAllApprovalTasksByContract = async (contractId: string): Promise<DeleteAllTasksResponse> => {
  return apiClient.delete(`/approvals/tasks/batch/by-contract/${contractId}`)
}

export const deleteAllApprovalTasksByTeacher = async (
  teacherName: string,
  department: string,
): Promise<DeleteAllTasksResponse> => {
  return apiClient.delete('/approvals/tasks/batch/by-teacher', {
    params: { teacher_name: teacherName, department },
  })
}

export interface SendReminderResponse {
  success: boolean
  message: string
  notification_count: number
}

export const sendApprovalReminder = async (params: {
  contractId?: string
  teacherName?: string
  department?: string
}): Promise<SendReminderResponse> => {
  const searchParams = new URLSearchParams()
  if (params.contractId) {
    searchParams.append('contract_id', params.contractId)
  }
  if (params.teacherName) {
    searchParams.append('teacher_name', params.teacherName)
  }
  if (params.department) {
    searchParams.append('department', params.department)
  }

  return apiClient.post<SendReminderResponse, SendReminderResponse>(`/approvals/tasks/send-reminder${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)
}
