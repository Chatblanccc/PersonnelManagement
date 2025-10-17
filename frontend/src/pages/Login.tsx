import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Space, Divider } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/90 to-slate-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="relative hidden flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 text-white shadow-2xl backdrop-blur lg:flex">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-lg font-semibold">
                  云
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-white/60">BAYUN ACADEMY</div>
                  <Title level={3} className="!m-0 !text-white">
                    教师人事合同管理平台
                  </Title>
                </div>
              </div>
              <Text className="mt-6 block text-base leading-7 text-white/80">
                支持合同 OCR 智能识别、全流程校核、加密存储与权限审批，让人事档案管理更高效、更安全。
              </Text>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                <div className="text-sm text-white/80">系统能力一览：</div>
                <ul className="mt-3 space-y-2 text-xs text-white/70">
                  <li>· 合同扫描件自动识别并结构化入库</li>
                  <li>· 40+ 教师人事字段高亮低置信度提醒</li>
                  <li>· Excel 批量导入导出与流水审计日志</li>
                  <li>· 基于角色的多维度权限控制与水印导出</li>
                </ul>
              </div>
              <Text className="block text-xs text-white/60">
                提醒：账号与操作将纳入系统日志审计，确保合规可追溯。
              </Text>
            </div>
          </div>

          <Card
            className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur"
            styles={{ body: { padding: '48px 40px' } }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-32 right-8 h-64 w-64 rounded-full bg-blue-500/10 blur-[140px]" />
              <div className="absolute bottom-4 left-10 h-32 w-32 rounded-full bg-sky-400/10 blur-[100px]" />
            </div>

            <div className="relative z-10">
              <Title level={2} className="!text-slate-800">
                登录账号
              </Title>
              <Text className="!text-slate-500">使用分配的工作账号访问系统</Text>

              <Divider className="!my-6" />

              <Form
                layout="vertical"
                onFinish={handleSubmit}
                requiredMark={false}
                initialValues={{ username: 'admin', password: 'Admin@123456' }}
              >
                <Form.Item
                  name="username"
                  label="账号"
                  rules={[{ required: true, message: '请输入账号' }]}
                >
                  <Input
                    prefix={<UserOutlined className="text-slate-400" />}
                    size="large"
                    placeholder="请输入工号或账号"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    size="large"
                    placeholder="请输入密码"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  className="mt-2 w-full"
                >
                  登录系统
                </Button>
              </Form>

              <Divider className="!my-6" plain>
                <span className="text-xs text-slate-400">系统提示</span>
              </Divider>

              <Space direction="vertical" size={8} className="w-full text-xs text-slate-500">
                <span>默认管理员账号：<strong>admin / Admin@123456</strong></span>
                <span>首次登录请及时修改密码，确保账号安全。</span>
                <span>如需开通新账号，请联系信息化中心。</span>
              </Space>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage

