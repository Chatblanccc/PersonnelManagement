import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

interface GuardOptions {
  redirectTo?: string
}

export const useAuthGuard = ({ redirectTo = '/login' }: GuardOptions = {}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))
  const isInitializing = useAuthStore((state) => state.isInitializing)
  useSessionTimeout()

  useEffect(() => {
    if (isInitializing) return

    if (!isAuthenticated) {
      navigate(redirectTo, { replace: true, state: { from: location.pathname } })
    }
  }, [isAuthenticated, isInitializing, navigate, location.pathname, redirectTo])

  return {
    isAuthenticated,
    isInitializing,
  }
}

