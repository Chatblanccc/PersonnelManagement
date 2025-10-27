import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { jwtDecode } from 'jwt-decode'

import type { AuthUser, MeResponse, TokenResponse } from '@/types/auth'
import type { TokenPayload } from '@/types/token'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  lastActivity: number | null
  user: AuthUser | null
  permissions: string[]
  isInitializing: boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean

  setTokens: (token: TokenResponse) => void
  clearTokens: () => void
  setSession: (payload: MeResponse) => void
  setInitializing: (value: boolean) => void
  updateActivity: (timestamp?: number) => void
}

type AuthPersistState = Pick<
  AuthState,
  'accessToken' | 'refreshToken' | 'expiresAt' | 'lastActivity' | 'user' | 'permissions'
>

const parseTokenExpiry = (token: string | null): number | null => {
  if (!token) return null
  try {
    const decoded = jwtDecode<TokenPayload>(token)
    return decoded.exp ? decoded.exp * 1000 : null
  } catch (error) {
    console.warn('解析 JWT 失败', error)
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], AuthPersistState>(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastActivity: null,
      user: null,
      permissions: [],
      isInitializing: true,

      hasPermission: (code: string) => {
        const permissions = get().permissions
        return permissions.includes('*') || permissions.includes(code)
      },

      hasAnyPermission: (codes: string[]) => {
        const permissions = get().permissions
        if (permissions.includes('*')) return true
        return codes.some((code) => permissions.includes(code))
      },

      setTokens: (token: TokenResponse) => {
        const accessTokenExpiry = parseTokenExpiry(token.access_token)
        const fallbackExpiry = token.expires_in ? Date.now() + token.expires_in * 1000 : null

        set({
          accessToken: token.access_token,
          refreshToken: token.refresh_token ?? null,
          expiresAt: accessTokenExpiry ?? fallbackExpiry,
          lastActivity: Date.now(),
        })
      },

      clearTokens: () => {
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          lastActivity: null,
          user: null,
          permissions: [],
        })
      },

      setSession: (payload: MeResponse) => {
        set({
          user: payload.user,
          permissions: payload.permissions,
        })
      },

      setInitializing: (value: boolean) => set({ isInitializing: value }),

      updateActivity: (timestamp) => {
        set({ lastActivity: timestamp ?? Date.now() })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage<AuthPersistState>(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        lastActivity: state.lastActivity,
        user: state.user,
        permissions: state.permissions,
      }),
    }
  )
)

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.accessToken)

export const selectHasPermission = (permission: string) => (state: AuthState) =>
  state.permissions.includes('*') || state.permissions.includes(permission)


