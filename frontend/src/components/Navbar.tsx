import { Layout, Typography, Space, Button, theme, Tag, Badge, Dropdown } from 'antd'
import { UserOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'

import { useAuthStore } from '@/store/authStore'
import { getRoleDisplayLabel } from '@/utils/role'
import { useUnreadCount } from '@/hooks/useProfile'

const { Header } = Layout
const { Title } = Typography

const Navbar = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const setInitializing = useAuthStore((state) => state.setInitializing)
  const userName = user?.full_name || user?.username || '管理员'
  const department = getRoleDisplayLabel(user?.roles?.[0]) || '白云实验学校 · 人事处'
  
  // 获取未读通知数量
  const { data: unreadData } = useUnreadCount()
  const unreadCount = unreadData?.unread_count || 0

  const handleLogout = () => {
    clearTokens()
    setInitializing(false)
    navigate('/login', { replace: true })
  }
  
  const handleProfileClick = () => {
    navigate('/profile')
  }
  
  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
      onClick: handleProfileClick,
    },
  ]

  const {
    token: { colorBgContainer, colorPrimary },
  } = theme.useToken()

  return (
    <Header
      className="relative mt-4 mx-6 flex items-center justify-between overflow-hidden rounded-2xl border border-white/60 px-8 py-4 backdrop-blur"
      style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(56,189,248,0.92))',
        boxShadow: '0 24px 55px rgba(37, 99, 235, 0.22)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute -top-32 left-12 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute -right-24 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-28 w-56 -rotate-6 rounded-full border border-white/30 bg-white/10" />
      </div>
      <Space size="large" className="relative z-10 items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/90 p-1.5 shadow-lg">
            <img src="/logo.png" alt="系统 Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <Title level={3} className="!mb-1 !text-white !tracking-wide">
              白云实验学校 · 教师合同管理平台
            </Title>
            <div className="text-sm text-white/80 leading-5">
              暨实校区 · 数智人事管理中心
            </div>
          </div>
        </div>
        <Tag
          color={colorBgContainer}
          style={{
            color: colorPrimary,
            border: '1px solid rgba(255,255,255,0.45)',
            fontWeight: 600,
            padding: '4px 12px',
          }}
        >
          “育人为本，云启未来”
        </Tag>
      </Space>
      <Space size={16} className="relative z-10">
        <div className="text-right text-white/80">
          <div className="text-sm font-medium">欢迎回来，{userName}</div>
          <div className="text-xs">{department}</div>
        </div>
        
        {/* 通知图标 */}
        <Badge count={unreadCount} offset={[-5, 5]}>
          <Button
            size="large"
            icon={<BellOutlined />}
            style={{
              backgroundColor: 'rgba(255,255,255,0.16)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
            onClick={() => navigate('/profile?tab=notifications')}
          />
        </Badge>
        
        <Button
          size="large"
          icon={<UserOutlined />}
          style={{
            backgroundColor: 'rgba(255,255,255,0.16)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
          onClick={handleProfileClick}
        >
          个人中心
        </Button>
        
        <Button
          size="large"
          icon={<LogoutOutlined />}
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
          onClick={handleLogout}
        >
          退出系统
        </Button>
      </Space>
      <div className="pointer-events-none absolute -right-6 top-1/2 hidden h-32 w-32 -translate-y-1/2 rotate-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl lg:flex">
        <div className="text-center text-xs uppercase tracking-[0.4em]">
          BAYUN
          <div className="mt-1 text-sm font-semibold tracking-[0em]">EDU</div>
        </div>
      </div>
    </Header>
  )
}

export default Navbar

