import apiClient from './client'
import type {
  LoginPayload,
  TokenResponse,
  MeResponse,
  UserListResponse,
  RoleListResponse,
  CreateUserPayload,
  UpdateUserPayload,
  AuthUser,
} from '@/types/auth'

export const login = (payload: LoginPayload): Promise<TokenResponse> => {
  return apiClient.post('/auth/login', payload)
}

export const refreshToken = (refresh_token: string): Promise<TokenResponse> => {
  return apiClient.post('/auth/refresh', { refresh_token })
}

export const fetchMe = (): Promise<MeResponse> => {
  return apiClient.get('/auth/me')
}

export const logout = (): Promise<void> => {
  return apiClient.post('/auth/logout')
}

export const fetchUsers = (params?: { page?: number; page_size?: number }): Promise<UserListResponse> => {
  return apiClient.get('/users', { params })
}

export const createUser = (payload: CreateUserPayload): Promise<AuthUser> => {
  return apiClient.post('/users', payload)
}

export const updateUser = (userId: string, payload: UpdateUserPayload): Promise<AuthUser> => {
  return apiClient.patch(`/users/${userId}`, payload)
}

export const deleteUser = (userId: string): Promise<void> => {
  return apiClient.delete(`/users/${userId}`)
}

export const fetchRoles = (): Promise<RoleListResponse> => {
  return apiClient.get('/users/roles')
}

