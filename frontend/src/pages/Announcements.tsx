import { useMemo, useState } from 'react'
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Skeleton,
  Badge,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  type AnnouncementPayload,
} from '@/api/announcements'

interface AnnouncementFormValues {
  region: string
  campusCode: string
  title: string
  summary: string
  schedule: string
}

const Announcements = () => {
  const user = useAuthStore((state) => state.user)
  const permissions = useAuthStore((state) => state.permissions)
  const hasPermission = useAuthStore((state) => state.hasPermission)

  const isSuperAdmin = useMemo(
    () => Boolean(user?.is_superuser || permissions.includes('*')),
    [permissions, user?.is_superuser]
  )
  const canManageAnnouncements = isSuperAdmin || hasPermission('announcements.manage')

  const canViewAnnouncements = useMemo(() => {
    if (isSuperAdmin) return true
    return hasPermission('announcements.read') || hasPermission('announcements.manage')
  }, [hasPermission, isSuperAdmin])

  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<AnnouncementFormValues>()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => getAnnouncements({}),
  })

  const mutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setModalOpen(false)
      form.resetFields()
      if (response.message) {
        message.success(response.message)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      if (response.message) {
        message.success(response.message)
      }
    },
  })

  const handleOpenModal = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload: AnnouncementPayload = {
        region: values.region,
        campus_code: values.campusCode,
        title: values.title,
        summary: values.summary,
        schedule: values.schedule,
      }

      await mutation.mutateAsync(payload)
    } catch (error) {
      console.error(error)
    }
  }

  if (!canViewAnnouncements) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <Empty description="暂无权限查看校园公告" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-[1px] shadow-xl">
        <div className="relative rounded-[calc(24px-1px)] bg-white px-8 py-10 sm:px-12">
          <div className="absolute right-10 top-10 hidden h-32 w-32 rounded-full bg-blue-100/70 blur-3xl sm:block" />
          <div className="absolute left-[-40px] bottom-[-40px] hidden h-40 w-40 rounded-full bg-purple-100/60 blur-3xl lg:block" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1 text-xs font-medium text-blue-700">
                校园公告中心
              </div>
              <Typography.Title level={2} className="!m-0 !text-slate-900">
                掌握校园最新动态
              </Typography.Title>
              <Typography.Paragraph className="!m-0 !max-w-2xl !text-base !text-slate-500">
                查看学校最新通知、重要活动安排与政策信息。管理员可在此快速创建或删除公告，确保全校师生第一时间掌握关键信息。
              </Typography.Paragraph>
              {!canManageAnnouncements && (
                <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs text-blue-500">
                  您当前为普通账号，仅可查看公告内容，如需发布请联系系统管理员。
                </div>
              )}
            </div>
            {canManageAnnouncements && (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Typography.Text type="secondary" className="!text-sm !text-slate-500">
                  发布新公告，分享关键资讯
                </Typography.Text>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleOpenModal}>
                  添加公告
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Typography.Title level={4} className="!m-0 !text-slate-800">
            公告列表
          </Typography.Title>
          {isFetching && (
            <Typography.Text className="!text-sm !text-slate-400">同步刷新中...</Typography.Text>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Skeleton active title paragraph={{ rows: 4 }} className="!mt-0" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty description="暂无公告" className="rounded-3xl border border-dashed border-slate-200 bg-white py-16" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((announcement) => {
              const createdAt = announcement.created_at ? dayjs(announcement.created_at).format('YYYY-MM-DD HH:mm') : ''
              const scheduleLabel = announcement.schedule || '敬请关注更多更新'
              const summary = announcement.summary || '暂无摘要信息，请点击公告详情了解更多内容。'

              return (
                <div
                  key={announcement.id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_22px_45px_rgba(47,63,102,0.08)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(47,63,102,0.12)]"
                >
                  {announcement.cover_url && (
                    <div
                      className="absolute inset-0 h-full w-full opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.12]"
                      style={{
                        backgroundImage: `url(${announcement.cover_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}
                  <div className="relative flex flex-col gap-6 p-6">
                    <div className="flex items-start justify-between">
                      <Space size="small" wrap>
                        {announcement.is_top && <Badge color="gold" text="置顶" />}
                        {announcement.region && (
                          <Tag color="processing" className="!m-0 !rounded-full !px-3 !py-1">
                            {announcement.region}
                          </Tag>
                        )}
                        {announcement.campus_code && (
                          <Tag color="blue" className="!m-0 !rounded-full !px-3 !py-1">
                            {announcement.campus_code}
                          </Tag>
                        )}
                      </Space>
                      {canManageAnnouncements && (
                        <div className="flex items-center gap-2">
                          <Tooltip title="删除公告">
                            <Popconfirm
                              title="确认删除公告"
                              description="删除后不可恢复，请确认是否继续。"
                              placement="left"
                              okText="删除"
                              okButtonProps={{ danger: true, loading: deleteMutation.isLoading }}
                              cancelText="取消"
                              onConfirm={() => deleteMutation.mutate(announcement.id)}
                            >
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                danger
                                loading={deleteMutation.isLoading}
                              />
                            </Popconfirm>
                          </Tooltip>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Typography.Title level={4} className="!m-0 !text-xl !leading-snug !text-slate-900">
                        {announcement.title}
                      </Typography.Title>
                      <Typography.Paragraph className="!m-0 !text-[15px] !leading-relaxed !text-slate-600">
                        {summary}
                      </Typography.Paragraph>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-600">{scheduleLabel}</span>
                        {createdAt && <span>发布时间：{createdAt}</span>}
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        {announcement.created_by && <span>发布人：{announcement.created_by}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        title="添加校园公告"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={mutation.isLoading ? '发布中...' : '发布'}
        confirmLoading={mutation.isLoading}
        destroyOnHidden
      >
        <Form<AnnouncementFormValues> form={form} layout="vertical">
          <Form.Item
            label="所属区域"
            name="region"
            rules={[{ required: true, message: '请输入所属区域' }]}
            initialValue="湾区"
          >
            <Input placeholder="例如：湾区" />
          </Form.Item>
          <Form.Item
            label="校区代号"
            name="campusCode"
            rules={[{ required: true, message: '请输入校区代号' }]}
            initialValue="BAYUN"
          >
            <Input placeholder="例如：BAYUN" />
          </Form.Item>
          <Form.Item
            label="公告标题"
            name="title"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="例如：暨实校区 2025 春季招聘启动" />
          </Form.Item>
          <Form.Item
            label="公告摘要"
            name="summary"
            rules={[{ required: true, message: '请输入公告摘要' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入公告重点信息" />
          </Form.Item>
          <Form.Item
            label="发布信息"
            name="schedule"
            rules={[{ required: true, message: '请输入发布时间信息' }]}
            initialValue={`发布于 ${new Date().toLocaleDateString('zh-CN')}`}
          >
            <Input placeholder="例如：发布于 2025-10-10" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Announcements


