import { Layout, Menu, Typography, Skeleton } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardOutlined, FileTextOutlined, SettingOutlined, ProjectOutlined, TeamOutlined, NotificationOutlined } from '@ant-design/icons'

import { useDashboardStatsFromStore, useSidebarSummary } from '@/hooks/useDashboardStats'
import { useAuthStore } from '@/store/authStore'

const { Sider } = Layout
const { Title } = Typography

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dashboardStats = useDashboardStatsFromStore()
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const canViewAuditInsights = hasPermission('contracts.audit')
  const { data: sidebarSummary, isLoading: summaryLoading } = useSidebarSummary()

  const isLoading = summaryLoading && canViewAuditInsights

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: '合同上传',
      permissions: ['contracts.create', 'contracts.import'],
    },
    {
      key: '/ledger',
      icon: <FileTextOutlined />,
      label: '合同台账',
      permissions: ['contracts.read'],
    },
    {
      key: '/announcements',
      icon: <NotificationOutlined />,
      label: '校园公告',
    },
    {
      key: '/approvals',
      icon: <ProjectOutlined />,
      label: '审批工作台',
      permissions: ['contracts.audit'],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      permissions: ['settings.manage'],
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: '账号权限',
      permissions: ['settings.manage'],
    },
  ].filter((item) => {
    if (!item.permissions) return true
    return item.permissions.some((code) => hasPermission(code))
  })

  const formatNumber = (value: number) => value.toLocaleString('zh-CN')

  const pendingReviewTotal = sidebarSummary?.pendingReview ?? dashboardStats?.pendingReview ?? 0
  const probationTeachers = sidebarSummary?.probationTeachers ?? dashboardStats?.breakdown?.probationTeachers ?? 0
  const expiringWithin90Days = sidebarSummary?.expiringWithin90Days ?? dashboardStats?.breakdown?.expiringWithin90Days ?? 0
  const expiringSoon = sidebarSummary?.expiringWithin30Days ?? dashboardStats?.expiringSoon ?? 0
  const averageConfidence = sidebarSummary?.averageConfidence ?? dashboardStats?.averageConfidence ?? 0

  const reminders = canViewAuditInsights && sidebarSummary
    ? [
        {
          color: 'bg-blue-400',
          text: `今日提醒：${formatNumber(pendingReviewTotal)} 份合同待复核 · ${formatNumber(probationTeachers)} 位教师正处试用阶段。`,
        },
        {
          color: 'bg-emerald-400',
          text: `续签预警：30 日内 ${formatNumber(expiringSoon)} 份合同到期，90 日内 ${formatNumber(expiringWithin90Days)} 份待续约，当前 OCR 平均置信度 ${(averageConfidence * 100).toFixed(0)}%。`,
        },
      ]
    : null

  return (
    <Sider
      width={260}
      theme="light"
      className="!bg-transparent"
      style={{ padding: '5px 0 2px 2px' }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-white text-slate-600 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-14 h-48 w-48 rounded-full bg-blue-100/55 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 translate-x-1/4 rounded-full bg-sky-200/35 blur-[120px]" />
          <div className="absolute left-1/2 top-24 h-16 w-28 -translate-x-1/2 rotate-12 border border-white/60" />
        </div>

        <div className="relative flex flex-1 flex-col">
          <div className="border-b border-white/70 px-8 pt-10 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-white/85 p-1.5 shadow-sm">
                <img src="/logo.png" alt="系统 Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.45em] text-blue-400">BAYUN ACADEMY</div>
                <Title level={4} className="!m-0 !text-slate-700">
                  教师人事中心
                </Title>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Menu
              mode="inline"
              theme="light"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              className="bayun-sidebar-menu"
            />

            <div className="mt-8 space-y-3 text-xs leading-6 text-slate-500">
              {reminders ? (
                reminders.map((item) => (
                  <div key={item.text} className="relative pl-4">
                    <span className={`absolute left-0 top-1 h-2 w-2 rounded-full ${item.color}`} />
                    {item.text}
                  </div>
                ))
              ) : isLoading ? (
                <div className="space-y-2">
                  <Skeleton paragraph={{ rows: 2, width: ['100%', '90%'] }} active title={false} />
                </div>
              ) : canViewAuditInsights ? (
                <div className="text-slate-400">暂无提醒数据</div>
              ) : (
                <div className="text-slate-400">当前账号无审批统计查看权限</div>
              )}
            </div>
          </div>

          <div className="border-t border-white/70 px-8 pb-8 pt-6 text-xs text-slate-500">
            <div className="font-semibold text-slate-600">白云实验学校 · 暨实校区人事处</div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>服务热线 020-1234-5678</span>
              <span>工作指引 ›</span>
            </div>
          </div>
        </div>
      </div>
    </Sider>
  )
}

export default Sidebar
