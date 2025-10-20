import apiClient from './client'

export interface AnnouncementItem {
  id: string
  title: string
  summary?: string
  region?: string
  campus_code?: string
  schedule?: string
  content?: string
  cover_url?: string
  is_top: boolean
  created_by: string
  created_by_name?: string
  created_at: string
  updated_at: string
}

export interface AnnouncementListResponse {
  total: number
  items: AnnouncementItem[]
}

export interface AnnouncementPayload {
  title: string
  summary?: string
  region?: string
  campus_code?: string
  schedule?: string
  content?: string
  cover_url?: string
  is_top?: boolean
}

export interface AnnouncementCreateResponse {
  message: string
  data: AnnouncementItem
}

export const getAnnouncements = async (params: { skip?: number; limit?: number } = {}): Promise<AnnouncementListResponse> => {
  return apiClient.get('/announcements', { params })
}

export const createAnnouncement = async (payload: AnnouncementPayload): Promise<AnnouncementCreateResponse> => {
  return apiClient.post('/announcements', payload)
}

export const deleteAnnouncement = async (
  id: string
): Promise<{ message: string; id: string; created_by_name?: string }> => {
  return apiClient.delete(`/announcements/${id}`)
}

