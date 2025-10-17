import apiClient from './client'
import type {
  WorkflowConfigResponse,
  WorkflowConfigUpdate,
} from '@/types/settings'

export const getWorkflowConfig = async (): Promise<WorkflowConfigResponse> => {
  return apiClient.get('/settings/workflow')
}

export const updateWorkflowConfig = async (
  payload: WorkflowConfigUpdate,
): Promise<WorkflowConfigResponse> => {
  return apiClient.put('/settings/workflow', payload)
}

