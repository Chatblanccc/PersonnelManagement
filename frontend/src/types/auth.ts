export interface Permission {
  id: string
  code: string
  description?: string | null
}

export interface Role {
  id: string
  name: string
  description?: string | null
  is_system: boolean
  is_default: boolean
  permissions: Permission[]
}

export interface AuthUser {
  id: string
  username: string
  email?: string | null
  full_name?: string | null
  status?: string | null
  is_active: boolean
  is_superuser: boolean
  last_login?: string | null
  
  // 个人中心新增字段
  avatar_url?: string | null
  teacher_code?: string | null
  department?: string | null
  position?: string | null
  job_status?: string | null
  phone_number?: string | null
  
  roles: Role[]
}

export interface LoginPayload {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

export interface MeResponse {
  user: AuthUser
  permissions: string[]
}

export interface UserListResponse {
  data: AuthUser[]
  total: number
  page: number
  page_size: number
}

export interface RoleListResponse {
  data: Role[]
  total: number
}

export interface CreateUserPayload {
  username: string
  password: string
  email?: string | null
  full_name?: string | null
  status?: string | null
  is_active?: boolean
  is_superuser?: boolean
  roles?: string[]
}

export interface UpdateUserPayload {
  email?: string | null
  full_name?: string | null
  status?: string | null
  is_active?: boolean
  is_superuser?: boolean
  roles?: string[]
  password?: string
}

