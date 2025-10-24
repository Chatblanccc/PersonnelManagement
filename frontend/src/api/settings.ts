import apiClient from './client'
import type {
  WorkflowConfigResponse,
  WorkflowConfigUpdate,
  FieldConfigCollection,
  FieldConfigCreate,
  FieldConfigResponse,
} from '@/types/settings'

export const getWorkflowConfig = async (): Promise<WorkflowConfigResponse> => {
  return apiClient.get('/settings/workflow')
}

export const updateWorkflowConfig = async (
  payload: WorkflowConfigUpdate,
): Promise<WorkflowConfigResponse> => {
  return apiClient.put('/settings/workflow', payload)
}

export const listFieldConfigs = async (): Promise<FieldConfigCollection> => {
  return apiClient.get('/settings/fields')
}

export const createFieldConfig = async (payload: FieldConfigCreate): Promise<FieldConfigResponse> => {
  return apiClient.post('/settings/fields', payload)
}

export const exportFieldConfigs = async (): Promise<Blob> => {
  return apiClient.get('/settings/fields/export', { responseType: 'blob' })
}

