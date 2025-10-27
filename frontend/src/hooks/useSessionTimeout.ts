import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { notifyWarning } from '@/utils/message'

const SESSION_TIMEOUT = 15 * 60 * 1000
const ACTIVITY_DEBOUNCE = 5 * 1000

const activityEvents: Array<keyof WindowEventMap> = [
  'click',
  'keydown',
  'mousemove',
  'touchstart',
  'wheel',
]

export const useSessionTimeout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const updateActivity = useAuthStore((state) => state.updateActivity)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const setInitializing = useAuthStore((state) => state.setInitializing)
  const timeoutTriggeredRef = useRef(false)

  const handleTimeout = useCallback(() => {
    if (timeoutTriggeredRef.current) return

    timeoutTriggeredRef.current = true
    notifyWarning('登录已超时，请重新登录')
    clearTokens()
    setInitializing(false)
    navigate('/login', { replace: true, state: { from: location.pathname, reason: 'timeout' } })
  }, [clearTokens, navigate, location.pathname, setInitializing])

  useEffect(() => {
    if (!accessToken) {
      timeoutTriggeredRef.current = false
      return
    }

    const ensureInitialActivity = () => {
      const { lastActivity } = useAuthStore.getState()
      if (!lastActivity) {
        updateActivity()
      }
    }

    ensureInitialActivity()
  }, [accessToken, updateActivity])

  useEffect(() => {
    if (!accessToken) return

    const handleActivity = () => {
      if (timeoutTriggeredRef.current) return

      const { lastActivity } = useAuthStore.getState()
      const now = Date.now()

      if (lastActivity && now - lastActivity >= SESSION_TIMEOUT) {
        handleTimeout()
        return
      }

      if (!lastActivity || now - lastActivity >= ACTIVITY_DEBOUNCE) {
        updateActivity(now)
      }
    }

    const checkTimeout = () => {
      if (timeoutTriggeredRef.current) return

      const { lastActivity } = useAuthStore.getState()
      if (!lastActivity) return

      if (Date.now() - lastActivity >= SESSION_TIMEOUT) {
        handleTimeout()
      }
    }

    activityEvents.forEach((event) => window.addEventListener(event, handleActivity, true))
    window.addEventListener('focus', handleActivity)

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      }
    }

    document.addEventListener('visibilitychange', visibilityHandler)

    const intervalId = window.setInterval(checkTimeout, 30 * 1000)

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity, true))
      window.removeEventListener('focus', handleActivity)
      document.removeEventListener('visibilitychange', visibilityHandler)
      window.clearInterval(intervalId)
    }
  }, [accessToken, handleTimeout, updateActivity])
}


