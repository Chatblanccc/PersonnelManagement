import type { Role } from '@/types/auth'

const ROLE_DISPLAY_MAP: Record<string, string> = {
  Administrator: '系统管理员',
  HR: '人事负责人',
  Auditor: '审计员',
  Viewer: '访客',
}

export const getRoleDisplayLabel = (role?: Role | string | null): string => {
  if (!role) return ''
  if (typeof role === 'string') {
    return ROLE_DISPLAY_MAP[role] ?? role
  }
  return role.description ?? ROLE_DISPLAY_MAP[role.name] ?? role.name
}


