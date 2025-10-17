import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Spin } from 'antd'
import { Suspense, useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from '@/components/Sidebar'
import Dashboard from './pages/Dashboard'
import Contracts from '@/pages/Contracts'
import Ledger from './pages/Ledger'
import Settings from '@/pages/Settings'
import Approvals from '@/pages/Approvals'
import AdminUsers from '@/pages/adminUsers'
import Announcements from '@/pages/Announcements'
import LoginPage from '@/pages/Login'
import Profile from '@/pages/Profile'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useAuthStore } from '@/store/authStore'
import { fetchMe } from '@/api/auth'
import './App.css'

const { Content } = Layout

function ProtectedLayout() {
  const { isInitializing } = useAuthGuard()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const setInitializing = useAuthStore((state) => state.setInitializing)
  const hasPermission = useAuthStore((state) => state.hasPermission)

  useEffect(() => {
    const initSession = async () => {
      if (!accessToken || user) {
        setInitializing(false)
        return
      }
      try {
        const me = await fetchMe()
        setSession(me)
      } catch (error) {
        console.error('初始化会话失败', error)
      } finally {
        setInitializing(false)
      }
    }

    void initSession()
  }, [accessToken, user, setSession, setInitializing])

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <span className="text-sm text-slate-500">正在加载用户数据...</span>
        </div>
      </div>
    )
  }

  return (
    <Layout className="min-h-screen bg-transparent">
      <Navbar />
      <Layout className="gap-6 px-6 pb-8">
        <Sidebar />
        <Layout
          className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(37,99,235,0.12)] backdrop-blur"
          style={{ margin: '5px 0 2px 2px' }}
        >
          <Content>
            <Suspense
              fallback={
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3">
                  <Spin size="large" />
                  <span className="text-sm text-slate-500">页面加载中...</span>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contracts" element={hasPermission('contracts.read') ? <Contracts /> : <Navigate to="/dashboard" replace />} />
                <Route path="/ledger" element={hasPermission('contracts.read') ? <Ledger /> : <Navigate to="/dashboard" replace />} />
                <Route path="/approvals" element={hasPermission('contracts.audit') ? <Approvals /> : <Navigate to="/dashboard" replace />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/settings" element={hasPermission('settings.manage') ? <Settings /> : <Navigate to="/dashboard" replace />} />
                <Route path="/admin/users" element={hasPermission('settings.manage') ? <AdminUsers /> : <Navigate to="/dashboard" replace />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Suspense>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
          <Spin size="large" />
          <span className="text-sm text-slate-500">页面加载中...</span>
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Suspense>
  )
}

export default App

