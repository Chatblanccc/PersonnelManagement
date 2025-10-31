import axios from 'axios'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { refreshToken as refreshTokenApi } from '@/api/auth'
import { notifyError } from '@/utils/message'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

const processQueue = (token: string | null) => {
  pendingRequests.forEach((callback) => {
    if (token) {
      callback(token)
    }
  })
  pendingRequests = []
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config) & { _retry?: boolean }

    // 登录接口的401错误不应该走token刷新逻辑，直接显示错误
    const isLoginRequest = originalRequest?.url?.includes('/auth/login')
    // 合同创建接口的错误由业务层处理，不在拦截器中显示
    // 匹配 POST /contracts 但不包括 /contracts/upload, /contracts/import 等
    const requestUrl = originalRequest?.url?.split('?')[0] || '' // 排除查询参数
    const isCreateContractRequest = 
      originalRequest?.method?.toLowerCase() === 'post' && 
      requestUrl.endsWith('/contracts') // 精确匹配以 /contracts 结尾的路径
    
    if (error.response?.status === 401 && originalRequest && !isLoginRequest) {
      if (originalRequest._retry) {
        return Promise.reject(error)
      }
      originalRequest._retry = true
      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState()

      if (!refreshToken) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers = originalRequest.headers ?? {}
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const tokenResponse = await refreshTokenApi(refreshToken)
        setTokens(tokenResponse)
        processQueue(tokenResponse.access_token)

        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${tokenResponse.access_token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response) {
      const { status, data } = error.response

      // 登录接口的错误由登录页面自己处理，不在拦截器中显示
      if (isLoginRequest && status === 401) {
        return Promise.reject(error)
      }

      // 合同创建接口的错误由业务层处理，不在拦截器中显示（400错误通常包含业务逻辑错误信息）
      if (isCreateContractRequest) {
        return Promise.reject(error)
      }

      switch (status) {
        case 403:
          notifyError('没有权限访问')
          break
        case 404:
          notifyError('请求的资源不存在')
          break
        case 500:
          notifyError('服务器错误')
          break
        default:
          notifyError((data as any)?.detail || '请求失败')
      }
    } else if (error.request) {
      notifyError('网络错误，请检查网络连接')
    } else {
      notifyError('请求配置错误')
    }

    return Promise.reject(error)
  }
)

export default apiClient

