import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme, App as AntdApp } from 'antd'
import { setMessageApi } from '@/utils/message'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'
import 'dayjs/locale/zh-cn'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const MessageInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message } = AntdApp.useApp()

  React.useEffect(() => {
    setMessageApi(message)
  }, [message])

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#2563eb',
            colorInfo: '#38bdf8',
            borderRadius: 10,
            fontFamily: '"PingFang SC", "HarmonyOS Sans", "Segoe UI", Arial, sans-serif',
            colorBgLayout: '#f5f9ff',
            colorBgContainer: 'rgba(255,255,255,0.92)',
            colorBorder: '#e2ecff',
            colorText: '#1f2d3d',
            colorTextSecondary: '#4b5b6b',
          },
          components: {
            Layout: {
              headerBg: 'transparent',
              headerHeight: 68,
              bodyBg: '#f5f9ff',
            },
            Menu: {
              itemSelectedColor: '#2563eb',
              itemSelectedBg: 'rgba(37,99,235,0.12)',
              itemBorderRadius: 10,
            },
            Card: {
              borderRadius: 16,
              paddingLG: 24,
              boxShadowTertiary: '0 18px 50px rgba(37, 99, 235, 0.08)',
            },
          },
        }}
      >
        <AntdApp>
          <MessageInitializer>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
            </BrowserRouter>
          </MessageInitializer>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

