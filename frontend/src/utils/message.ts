import type { MessageInstance } from 'antd/es/message/interface'

let messageApi: MessageInstance | null = null

export const setMessageApi = (api: MessageInstance) => {
  messageApi = api
}

const call = (method: keyof MessageInstance, content: string) => {
  if (!messageApi) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[message] messageApi 未初始化，无法提示：', content)
    }
    return
  }

  messageApi[method](content as any)
}

export const notifySuccess = (content: string) => call('success', content)
export const notifyError = (content: string) => call('error', content)
export const notifyInfo = (content: string) => call('info', content)
export const notifyWarning = (content: string) => call('warning', content)

