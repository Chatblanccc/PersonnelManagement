import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Divider } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { login, fetchMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { notifyError, notifySuccess } from '@/utils/message'

const { Title, Text } = Typography

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setSession = useAuthStore((state) => state.setSession)
  const setInitializing = useAuthStore((state) => state.setInitializing)

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      setLoading(true)
      const token = await login(values)
      setTokens(token)

      const me = await fetchMe()
      setSession(me)
      notifySuccess('登录成功，欢迎回来！')

      const redirectPath = (location.state as { from?: string })?.from ?? '/dashboard'
      navigate(redirectPath, { replace: true })
    } catch (error: any) {
      console.error('登录失败', error)
      notifyError(error?.response?.data?.detail ?? '登录失败，请检查账号或密码')
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2c]">
      <div className="absolute left-0 top-0 z-20 flex items-center gap-3 px-10 py-8 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-lg font-semibold">
          云
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.45em] text-white/60">BAYUN ACADEMY</div>
          <Title level={3} className="!m-0 !text-white">
            教师合同管理系统
          </Title>
          <Text className="!text-white/70">Teacher Personnel Contract Management</Text>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(96,165,250,0.28),transparent_60%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.24),transparent_55%),radial-gradient(circle_at_50%_85%,rgba(56,189,248,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_45%)] mix-blend-screen" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#090f2c] via-[#101845]/90 to-transparent" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg items-center justify-center px-6 pb-12 pt-24 sm:py-24">
        <div className="relative w-full">
          <div className="absolute inset-0 rounded-[36px] bg-white/10" />
          <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-white/40 via-white/20 to-white/5 opacity-80" />
          <div className="absolute inset-[1.5px] rounded-[34.5px] border border-white/40/50" />

          <Card
            className="relative overflow-hidden rounded-[36px] border border-white/25 bg-white/10 shadow-[0_28px_80px_rgba(13,37,78,0.35)] backdrop-blur-3xl"
            styles={{ body: { padding: '48px 44px', background: 'transparent' } }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[-34px] top-[-50px] h-36 w-36 rounded-full bg-blue-300/25 blur-[100px]" />
              <div className="absolute left-[-50px] bottom-[-60px] h-32 w-32 rounded-full bg-indigo-300/20 blur-[100px]" />
              <div className="absolute inset-0 rounded-[36px] border border-white/35" />
            </div>

            <div className="relative z-10 space-y-6">
              <header className="space-y-2 text-center">
                <Title level={2} className="!m-0 !text-white">
                  登录系统
                </Title>
                <Text className="!text-white/70">请输入账号密码，开始您的工作</Text>
              </header>

              <Divider className="!my-6 !border-white/15">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Account Sign-In</span>
              </Divider>

              <Form
                layout="vertical"
                onFinish={handleSubmit}
                requiredMark={false}
                className="space-y-4"
              >
                <Form.Item
                  name="username"
                  label={<span className="text-sm text-white/80">账号</span>}
                  rules={[{ required: true, message: '请输入账号' }]}
                  className="mb-0"
                >
                  <Input
                    prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />}
                    size="large"
                    placeholder="请输入工号或账号"
                    className="!text-white !placeholder:text-white/50"
                    rootClassName="!h-12 !rounded-2xl !border-white/30 !bg-white/10 !backdrop-blur-2xl !border !border-solid !border-white/30 !shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-sm text-white/80">密码</span>}
                  rules={[{ required: true, message: '请输入密码' }]}
                  className="mb-0"
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />}
                    size="large"
                    placeholder="请输入密码"
                    className="!text-white tracking-[0.08em] !placeholder:text-white/50"
                    rootClassName="!h-12 !rounded-2xl !border-white/30 !bg-white/10 !backdrop-blur-2xl !border !border-solid !border-white/30 !shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-base font-semibold shadow-[0_22px_42px_rgba(88,80,236,0.4)] transition duration-300 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400 hover:shadow-[0_24px_46px_rgba(88,80,236,0.45)]"
                >
                  登录系统
                </Button>
              </Form>

              <Divider className="!my-6 !border-white/12" plain>
                <span className="text-xs text-white/45">系统提示</span>
              </Divider>

              <div className="space-y-2 text-xs text-white/65">
                <span>
                  默认管理员账号：<strong className="text-white">admin / Admin@123456</strong>
                </span>
                <span>首次登录请及时修改密码，确保账号安全。</span>
                <span>如需开通新账号，请联系信息化中心。</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

