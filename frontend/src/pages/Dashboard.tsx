import { useState } from 'react'
import { Card, Row, Col, Space, Typography, Button, Tag, Skeleton, Empty, Tooltip } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'

import { motion } from 'framer-motion'

import AddTeacherModal from '@/components/AddTeacherModal'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useQuery } from '@tanstack/react-query'
import { getAnnouncements } from '@/api/announcements'
import dayjs from 'dayjs'

const { Title } = Typography

const Dashboard = () => {
  const [showAddModal, setShowAddModal] = useState(false)
  const { data: stats, isLoading } = useDashboardStats()
  const navigate = useNavigate()
  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: () => getAnnouncements({ limit: 3 }),
  })

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} className="!mb-1 !text-slate-800">
            白云实验学校 · 教师人事中心
          </Title>
          <div className="text-slate-500">
            暨实校区 · 掌握教师合同生命周期，辅助人事科学决策
          </div>
        </div>
        <Space size={16} wrap>
          <Tag color="blue" className="px-4 py-2 text-sm font-medium">
            {isLoading ? '数据加载中…' : `系统在库教师 ${stats?.totalTeachers ?? '--'} 人`}
          </Tag>
          <Button type="primary" size="large" onClick={() => setShowAddModal(true)}>
            新增教师入职
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {[
          {
            title: '教师总数',
            key: 'totalTeachers',
            value: stats?.totalTeachers,
            icon: <UserOutlined />,
            iconClassName: 'bg-emerald-100 text-emerald-600',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.92), rgba(20,184,166,0.92))',
            footer: isLoading
              ? '统计加载中…'
              : `含专任教师 ${stats?.breakdown?.totalTeachersBreakdown?.regular ?? 0} 人 · 外聘教师 ${
                  stats?.breakdown?.totalTeachersBreakdown?.partTime ?? 0
                } 人`,
          },
          {
            title: '在职合同',
            key: 'activeContracts',
            value: stats?.activeContracts,
            icon: <FileTextOutlined />,
            iconClassName: 'bg-blue-100 text-blue-600',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.96), rgba(56,189,248,0.92))',
            footer: isLoading
              ? '统计加载中…'
              : `试用期教师 ${stats?.breakdown?.probationTeachers ?? 0} 人 · 90 日内到期 ${
                  stats?.breakdown?.expiringWithin90Days ?? 0
                } 份`,
          },
          {
            title: '即将到期',
            key: 'expiringSoon',
            value: stats?.expiringSoon,
            icon: <ClockCircleOutlined />,
            iconClassName: 'bg-amber-100 text-amber-600',
            background: 'linear-gradient(135deg, rgba(251,146,60,0.95), rgba(234,179,8,0.92))',
            footer: '建议提前 30 日完成续签沟通',
            onClick: () =>
              navigate('/ledger?filter=expiringSoon'),
          },
          {
            title: '待复核',
            key: 'pendingReview',
            value: stats?.pendingReview,
            icon: <CheckCircleOutlined />,
            iconClassName: 'bg-rose-100 text-rose-600',
            background: 'linear-gradient(135deg, rgba(244,63,94,0.95), rgba(236,72,153,0.92))',
            footer: 'OCR 置信度低或字段缺失的合同',
          },
        ].map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
              <Card
                onClick={item.onClick}
                hoverable={Boolean(item.onClick)}
                className="relative overflow-hidden border-none text-white"
                styles={{
                  body: {
                    background: item.background,
                    boxShadow: '0 18px 38px rgba(37, 99, 235, 0.18)',
                    padding: 24,
                    borderRadius: 24,
                  },
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm uppercase tracking-[0.35em] text-white/70">
                      BAYUN INSIGHT
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {item.title}
                    </div>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-xl ${item.iconClassName}`}>
                    {item.icon}
                  </div>
                </div>
                <div className="mt-6 text-4xl font-bold">
                  {isLoading ? <Skeleton.Input active size="large" className="!h-10 !w-24" /> : item.value ?? '--'}
                </div>
                <div className="mt-4 text-sm text-white/80">{item.footer}</div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title="合同生命周期追踪"
            className="rounded-3xl border border-white/60 bg-white/90"
            extra={
              <Button type="link" className="!px-0" onClick={() => navigate('/ledger')}>
                查看详细
              </Button>
            }
          >
            <Space direction="vertical" className="w-full" size="middle">
              <div className="grid gap-3 md:grid-cols-3">
                {['入职准备', '资格审核', '试用评估', '合同签署', '复核归档', '续签提醒'].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600 shadow-sm"
                  >
                    <div className="text-xs text-blue-400">阶段 {index + 1}</div>
                    <div className="mt-2 text-base font-semibold text-slate-700">{step}</div>
                    <div className="mt-2 text-xs text-slate-500">白云实验学校教师合同标准流程节点</div>
                  </div>
                ))}
              </div>
              <Space size={12} wrap>
                <Button type="primary" ghost onClick={() => navigate('/settings?tab=workflow')}>
                  查看流程设置
                </Button>
                <Button type="default" onClick={() => navigate('/approvals')}>
                  审批工作台
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title="校园公告"
            className="rounded-3xl border border-white/70 bg-gradient-to-br from-[#3B68F3] via-[#516BF7] to-[#4B83F9] text-white"
            styles={{ body: { color: 'rgba(255,255,255,0.92)' } }}
            extra={
              <Button type="link" className="!text-white/80" onClick={() => navigate('/announcements')}>
                全部公告
              </Button>
            }
          >
            {loadingAnnouncements ? (
              <Space direction="vertical" size="large" className="w-full">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-2xl bg-white/10 p-4">
                    <Skeleton active title paragraph={{ rows: 2 }} className="!mt-0" />
                  </div>
                ))}
              </Space>
            ) : !announcements || announcements.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/40 bg-white/10 py-12">
                <Empty description="暂无公告" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <Space direction="vertical" size="large" className="w-full">
                {announcements.items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-white/30 bg-white/12 px-5 py-4 transition duration-200 hover:bg-white/20"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
                      <span>{item.region ? `${item.region}${item.campus_code ? ` · ${item.campus_code}` : ''}` : item.campus_code ?? '校园公告'}</span>
                      {item.created_at && <span>{dayjs(item.created_at).format('MM/DD')}</span>}
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <Typography.Text strong className="!text-base !text-white">
                        {item.title}
                      </Typography.Text>
                      {item.is_top && (
                        <Tag color="gold" className="!m-0 !rounded-full !px-3 !py-1">
                          置顶
                        </Tag>
                      )}
                    </div>
                    <Typography.Paragraph className="!mt-2 !mb-0 !text-sm !text-white/80" ellipsis={{ rows: 2 }}>
                      {item.summary || '暂无摘要信息，请查看公告详情。'}
                    </Typography.Paragraph>
                    <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                      <span>{item.schedule || '近期更新，敬请关注'}</span>
                      <Tooltip title="查看公告详情">
                        <Button
                          type="text"
                          size="small"
                          className="!text-white/80"
                          onClick={() => navigate('/announcements')}
                        >
                          查看详情
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <AddTeacherModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </Space>
  )
}

export default Dashboard

