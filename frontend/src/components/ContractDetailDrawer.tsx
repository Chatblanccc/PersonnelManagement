import { useMemo, useState, useCallback } from 'react'
import {
  Drawer,
  Descriptions,
  Tag,
  Space,
  Divider,
  Typography,
  Timeline,
  Tabs,
  Avatar,
  Skeleton,
  Empty,
  Tooltip,
  Badge,
  Alert,
  Card,
  Button,
  Form,
  Input,
  Select,
  Modal,
  Upload,
  Popconfirm,
} from 'antd'
import {
  FileTextOutlined,
  FieldTimeOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  TeamOutlined,
  AuditOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import type {
  Contract,
  ContractLifecycleDetail,
  ContractLifecycleSummary,
  ContractTimelineEvent,
  ContractAttachment,
  ContractTimelineEventType,
} from '@/types/contract'
import { staticFieldConfigs, fieldGroups } from '@/utils/fieldMapping'
import { formatDate } from '@/utils/date'
import type { UploadProps } from 'antd'
import type { RcFile } from 'antd/es/upload/interface'
import { useCreateTimelineEvent, useDeleteTimelineEvent, useUploadContractAttachment, useDeleteContractAttachment, useDownloadContractAttachment } from '@/hooks/useContracts'
import { notifyError, notifySuccess } from '@/utils/message'

const { Text } = Typography

interface ContractDetailDrawerProps {
  open: boolean
  contract: Contract | null
  onClose: () => void
  lifecycleDetail: ContractLifecycleDetail | null
  lifecycleSummary?: ContractLifecycleSummary | null
  lifecycleLoading?: boolean
  onRefreshLifecycle?: () => void
}

const lifecycleTypeToColor: Record<string, string> = {
  uploaded: 'blue',
  ocr_completed: 'cyan',
  reviewed: 'purple',
  entry: 'green',
  regularized: 'lime',
  renewal: 'orange',
  change: 'gold',
  termination: 'red',
  note: 'geekblue',
  other: 'gray',
}

const lifecycleTypeToLabel: Record<string, string> = {
  uploaded: '上传文件',
  ocr_completed: 'OCR 识别',
  reviewed: '人工复核',
  entry: '入职',
  regularized: '转正',
  renewal: '续签',
  change: '变更',
  termination: '离职/终止',
  note: '备注',
  other: '其他',
}

const ContractDetailDrawer = ({
  open,
  contract,
  onClose,
  lifecycleDetail,
  lifecycleSummary,
  lifecycleLoading,
  onRefreshLifecycle,
}: ContractDetailDrawerProps) => {
  const [timelineModalOpen, setTimelineModalOpen] = useState(false)
  const [timelineForm] = Form.useForm()
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const [deletingTimelineId, setDeletingTimelineId] = useState<string | null>(null)

  const createTimelineMutation = useCreateTimelineEvent()
  const deleteTimelineMutation = useDeleteTimelineEvent()
  const uploadAttachmentMutation = useUploadContractAttachment()
  const deleteAttachmentMutation = useDeleteContractAttachment()
  const downloadAttachmentMutation = useDownloadContractAttachment()

  const handleLifecycleRefresh = useCallback(() => {
    if (onRefreshLifecycle) {
      onRefreshLifecycle()
    }
  }, [onRefreshLifecycle])

  const timelineTypeOptions = useMemo(
    () =>
      Object.entries(lifecycleTypeToLabel).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  )

  const resolveTimelineType = (item: ContractTimelineEvent) => item.type || item.event_type || 'other'

  const handleTimelineSubmit = async () => {
    if (!contract) {
      notifyError('合同信息缺失，无法新增事件')
      return
    }
    try {
      const values = (await timelineForm.validateFields()) as {
        event_type: ContractTimelineEventType
        title: string
        description?: string
      }
      await createTimelineMutation.mutateAsync({
        contractId: contract.id,
        data: {
          event_type: values.event_type,
          title: values.title,
          description: values.description || undefined,
        },
      })
      setTimelineModalOpen(false)
      timelineForm.resetFields()
      handleLifecycleRefresh()
    } catch (error) {
      const validationError = error as { errorFields?: unknown }
      if (validationError?.errorFields) {
        return
      }
      // useCreateTimelineEvent 已处理错误提示
    }
  }

  const handleDeleteTimeline = useCallback(
    async (eventId: string) => {
      if (!contract) {
        notifyError('合同信息缺失，无法删除事件')
        return
      }
      setDeletingTimelineId(eventId)
      try {
        await deleteTimelineMutation.mutateAsync({ contractId: contract.id, eventId })
        handleLifecycleRefresh()
      } catch (error) {
        // 错误提示已在 Hook 中处理
      } finally {
        setDeletingTimelineId(null)
      }
    },
    [contract, deleteTimelineMutation, handleLifecycleRefresh],
  )

  const handleAttachmentUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!contract || !(file instanceof File)) {
      onError?.(new Error('无效的文件'))
      return
    }

    try {
      const uploadFile = file as RcFile
      await uploadAttachmentMutation.mutateAsync({ contractId: contract.id, file })
      onSuccess?.({}, uploadFile)
      handleLifecycleRefresh()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('附件上传失败'))
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!contract) {
      notifyError('合同信息缺失，无法删除附件')
      return
    }
    setDeletingAttachmentId(attachmentId)
    try {
      await deleteAttachmentMutation.mutateAsync({ contractId: contract.id, attachmentId })
      handleLifecycleRefresh()
    } catch (error) {
      // 错误提示已在 Hook 中处理
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  const handleDownloadAttachment = async (attachment: ContractAttachment) => {
    if (!contract) {
      notifyError('合同信息缺失，无法下载附件')
      return
    }
    setDownloadingAttachmentId(attachment.id)
    try {
      const blob = await downloadAttachmentMutation.mutateAsync({
        contractId: contract.id,
        attachmentId: attachment.id,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.name || '合同附件'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      notifySuccess('附件下载成功')
    } catch (error) {
      notifyError('附件下载失败，请稍后重试')
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  const attachmentUploadProps: UploadProps = {
    showUploadList: false,
    customRequest: handleAttachmentUpload,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
    disabled: !contract || uploadAttachmentMutation.isPending,
  }

  const timelineItems = useMemo(() => {
    if (!lifecycleDetail?.timeline?.length) return []
    return lifecycleDetail.timeline
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((item) => {
        const eventType = resolveTimelineType(item)
        return {
          color: lifecycleTypeToColor[eventType] || 'blue',
          dot: <ClockCircleOutlined className="text-slate-400" />,
          children: (
            <div className="space-y-1 rounded-lg border border-slate-100 bg-white/70 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Badge color={lifecycleTypeToColor[eventType] || 'blue'} />
                  <span className="font-medium">{item.title || lifecycleTypeToLabel[eventType] || '事件'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Text type="secondary" className="text-xs">
                    {formatDate(item.created_at)}
                  </Text>
                  <Popconfirm
                    title="确定删除该事件吗？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => handleDeleteTimeline(item.id)}
                    disabled={deleteTimelineMutation.isPending && deletingTimelineId !== item.id}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteTimelineMutation.isPending && deletingTimelineId === item.id}
                    />
                  </Popconfirm>
                </div>
              </div>
              {item.description && <Text className="block text-sm text-slate-600">{item.description}</Text>}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {item.operator && (
                  <span className="flex items-center gap-1">
                    <TeamOutlined /> {item.operator}
                  </span>
                )}
                {item.extra_data?.status && (
                  <span className="flex items-center gap-1">
                    <FileProtectOutlined /> {item.extra_data.status}
                  </span>
                )}
                {item.extra_data?.next_action && (
                  <Tooltip title={item.extra_data.next_action.detail}>
                    <span className="flex items-center gap-1 text-orange-500">
                      <ClockCircleOutlined /> 下一步：{item.extra_data.next_action.label}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          ),
        }
      })
  }, [deletingTimelineId, deleteTimelineMutation.isPending, handleDeleteTimeline, lifecycleDetail?.timeline])

  const attachments = lifecycleDetail?.attachments || []
  const logs = lifecycleDetail?.logs || []

  if (!contract) {
    return (
      <Drawer open={open} onClose={onClose} destroyOnClose width={720} title="合同详情">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Drawer>
    )
  }

  const renderValue = (key: string) => {
    const config = staticFieldConfigs.find((item) => item.key === key)
    const value = contract[key as keyof Contract]

    if (value === null || value === undefined || value === '') {
      return '-'
    }

    if (config?.type === 'date') {
      return formatDate(value as string)
    }

    return value
  }

  const groupedFields = Object.entries(fieldGroups).map(([groupKey, groupLabel]) => {
    const fields = staticFieldConfigs.filter((config) => config.group === groupKey)
    return {
      key: groupKey,
      label: groupLabel,
      fields,
    }
  })

  return (
    <Drawer
      width={880}
      title={
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-[0.35em] text-blue-400">BAYUN CONTRACT DETAIL</div>
          <div className="text-xl font-semibold text-slate-800">{contract.name || '合同详情'}</div>
          <div className="text-sm text-slate-500">员工工号：{contract.teacher_code || '-'}</div>
        </div>
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      styles={{ body: { paddingBottom: 32 } }}
    >
      <Space direction="vertical" size={24} className="w-full">
        <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-blue-500">在职状态</div>
            <div className="mt-2 text-lg font-semibold text-blue-700">{contract.job_status || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-blue-500">合同周期</div>
            <div className="mt-2 text-sm text-slate-700">
              {renderValue('contract_start')} ~ {renderValue('contract_end')}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Tag icon={<FileTextOutlined />} color="processing">
              OCR 平均置信度：{contract.ocr_confidence ? `${Math.round(contract.ocr_confidence * 100)}%` : '未记录'}
            </Tag>
            {contract.teaching_years !== undefined && (
              <Tag icon={<FieldTimeOutlined />} color="success">
                教龄：{contract.teaching_years ?? '-'} 年
              </Tag>
            )}
            {lifecycleSummary?.nextAction && lifecycleSummary.nextAction.type !== 'none' && (
              <Tooltip title={lifecycleSummary.nextAction.message}>
                <Tag icon={<AlertOutlined />} color="warning">
                  下一步：{lifecycleSummary.nextAction.label ?? lifecycleSummary.nextAction.type}
                  {lifecycleSummary.nextAction.days_left !== undefined
                    ? `（${lifecycleSummary.nextAction.days_left} 天后）`
                    : ''}
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>

        {lifecycleSummary && (lifecycleSummary.pendingReviewFields?.length || lifecycleSummary.warnings?.length) ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/70 shadow-sm">
            <Space direction="vertical" className="w-full">
              {lifecycleSummary.pendingReviewFields?.length ? (
                <Alert
                  message="待复核字段"
                  description={
                    <div className="flex flex-wrap gap-2">
                      {lifecycleSummary.pendingReviewFields.map((field) => {
                        const config = staticFieldConfigs.find((item) => item.key === field)
                        return (
                          <Tag key={field} color="warning">
                            {config?.label || field}
                          </Tag>
                        )
                      })}
                    </div>
                  }
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
              ) : null}
              {lifecycleSummary.warnings?.length ? (
                <Alert
                  message="风险提醒"
                  description={
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {lifecycleSummary.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                />
              ) : null}
            </Space>
          </Card>
        ) : null}

        {groupedFields.map((group) => {
          const availableFields = group.fields.filter((field) => field.key in contract)

          if (!availableFields.length) return null

          return (
            <div key={group.key} className="space-y-3">
              <Divider plain orientation="left" orientationMargin={0} className="!m-0">
                <span className="text-base font-semibold text-slate-700">{group.label}</span>
              </Divider>
              <Descriptions bordered column={2} size="small" labelStyle={{ width: 140 }}>
                {availableFields.map((field) => (
                  <Descriptions.Item key={field.key} label={field.label} span={field.type === 'number' ? 1 : 1}>
                    {renderValue(field.key)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          )
        })}

        <div className="space-y-3">
          <Divider plain orientation="left" orientationMargin={0} className="!m-0">
            <span className="text-base font-semibold text-slate-700">其他信息</span>
          </Divider>
          <Tabs
            defaultActiveKey="timeline"
            items={[
              {
                key: 'timeline',
                label: (
                  <span className="flex items-center gap-2">
                    <ClockCircleOutlined /> 合同生命周期
                  </span>
                ),
                children: lifecycleLoading ? (
                  <Skeleton active paragraph={{ rows: 6 }} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setTimelineModalOpen(true)}
                        disabled={!contract}
                      >
                        新增事件
                      </Button>
                    </div>
                    {timelineItems?.length ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                        <Timeline items={timelineItems} className="timeline-contract" />
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无生命周期记录"
                        className="py-8"
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'files',
                label: (
                  <span className="flex items-center gap-2">
                    <FileTextOutlined /> 合同附件
                  </span>
                ),
                children: lifecycleLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Upload {...attachmentUploadProps}>
                        <Button icon={<UploadOutlined />} loading={uploadAttachmentMutation.isPending}>
                          上传附件
                        </Button>
                      </Upload>
                    </div>
                    {attachments.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {attachments.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white/80 p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                          >
                            <Avatar shape="square" size={48} className="bg-blue-500/10 text-blue-500">
                              <FileTextOutlined />
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium text-slate-700">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {item.file_type.toUpperCase()} · 上传于 {formatDate(item.uploaded_at)}
                                {item.uploader ? ` · ${item.uploader}` : ''}
                              </div>
                            </div>
                            <Space size={4}>
                              <Button
                                size="small"
                                type="text"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadAttachment(item)}
                                loading={downloadingAttachmentId === item.id && downloadAttachmentMutation.isPending}
                              />
                              <Popconfirm
                                title="确定删除该附件吗？"
                                okText="删除"
                                cancelText="取消"
                                onConfirm={() => handleDeleteAttachment(item.id)}
                                disabled={deleteAttachmentMutation.isPending}
                              >
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  loading={deletingAttachmentId === item.id && deleteAttachmentMutation.isPending}
                                />
                              </Popconfirm>
                            </Space>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span>
                            未上传附件
                            {contract.file_url ? (
                              <a href={contract.file_url} target="_blank" rel="noreferrer" className="ml-1 text-blue-600">
                                查看原始文件
                              </a>
                            ) : null}
                          </span>
                        }
                        className="py-8"
                      />
                    )}
                  </div>
                ),
              },
              {
                key: 'logs',
                label: (
                  <span className="flex items-center gap-2">
                    <HistoryOutlined /> 操作日志
                  </span>
                ),
                children: lifecycleLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : logs.length ? (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-100 bg-white/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <AuditOutlined className="text-blue-500" />
                            <span className="font-medium">{log.action}</span>
                          </div>
                          <Text type="secondary" className="text-xs">
                            {formatDate(log.created_at)}
                          </Text>
                        </div>
                        <div className="mt-2 space-y-2 text-sm text-slate-600">
                          {log.operator && <div>操作人：{log.operator}</div>}
                          {log.detail && <div>说明：{log.detail}</div>}
                          {log.changes?.length ? (
                            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs">
                              <div className="mb-2 font-medium text-blue-700">字段变更</div>
                              <div className="space-y-2">
                                {log.changes.map((change, idx) => (
                                  <div key={`${log.id}-${change.field}-${idx}`} className="rounded-md border border-white/60 bg-white/70 p-2">
                                    <div className="text-slate-500">{change.field_label}</div>
                                    <div className="mt-1 flex gap-2 text-slate-700">
                                      <span className="flex-1">
                                        <Text type="secondary">原值：</Text>
                                        {change.before ?? '-'}
                                      </span>
                                      <span className="flex-1">
                                        <Text type="secondary">新值：</Text>
                                        {change.after ?? '-'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无操作日志"
                    className="py-8"
                  />
                ),
              },
            ]}
          />
        </div>
        <Modal
          open={timelineModalOpen}
          title="新增生命周期事件"
          okText="保存"
          cancelText="取消"
          onCancel={() => setTimelineModalOpen(false)}
          onOk={handleTimelineSubmit}
          confirmLoading={createTimelineMutation.isPending}
          destroyOnClose
        >
          <Form layout="vertical" form={timelineForm} initialValues={{ event_type: 'note' }}>
            <Form.Item
              name="event_type"
              label="事件类型"
              rules={[{ required: true, message: '请选择事件类型' }]}
            >
              <Select options={timelineTypeOptions} placeholder="请选择事件类型" allowClear={false} />
            </Form.Item>
            <Form.Item
              name="title"
              label="事件标题"
              rules={[{ required: true, message: '请输入事件标题' }]}
            >
              <Input placeholder="如：合同续签" maxLength={60} />
            </Form.Item>
            <Form.Item name="description" label="事件描述">
              <Input.TextArea rows={3} maxLength={200} placeholder="可选，补充说明当前节点信息" />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </Drawer>
  )
}

export default ContractDetailDrawer

