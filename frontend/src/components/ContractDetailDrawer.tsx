import { useMemo } from 'react'
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
} from '@ant-design/icons'
import type { Contract, ContractLifecycleDetail, ContractLifecycleSummary } from '@/types/contract'
import { staticFieldConfigs, fieldGroups } from '@/utils/fieldMapping'
import { formatDate } from '@/utils/date'

const { Text } = Typography

interface ContractDetailDrawerProps {
  open: boolean
  contract: Contract | null
  onClose: () => void
  lifecycleDetail: ContractLifecycleDetail | null
  lifecycleSummary?: ContractLifecycleSummary | null
  lifecycleLoading?: boolean
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

const ContractDetailDrawer = ({ open, contract, onClose, lifecycleDetail, lifecycleSummary, lifecycleLoading }: ContractDetailDrawerProps) => {
  const timelineItems = useMemo(() => {
    if (!lifecycleDetail?.timeline?.length) return []
    return lifecycleDetail.timeline
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((item) => ({
        color: lifecycleTypeToColor[item.type] || 'blue',
        dot: <ClockCircleOutlined className="text-slate-400" />,
        children: (
          <div className="space-y-1 rounded-lg border border-slate-100 bg-white/70 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <Badge color={lifecycleTypeToColor[item.type] || 'blue'} />
                <span className="font-medium">{item.title || lifecycleTypeToLabel[item.type] || '事件'}</span>
              </div>
              <Text type="secondary" className="text-xs">
                {formatDate(item.created_at)}
              </Text>
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
      }))
  }, [lifecycleDetail?.timeline])

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
                ) : timelineItems?.length ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <Timeline
                      items={timelineItems}
                      className="timeline-contract"
                    />
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无生命周期记录"
                    className="py-8"
                  />
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
                ) : attachments.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {attachments.map((item) => (
                      <a
                        key={item.id}
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white/80 p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                      >
                        <Avatar shape="square" size={48} className="bg-blue-500/10 text-blue-500">
                          <FileTextOutlined />
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-slate-700">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.file_type.toUpperCase()} · 上传于 {formatDate(item.uploaded_at)}
                            {item.uploader ? ` · ${item.uploader}` : ''}
                          </div>
                        </div>
                      </a>
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
      </Space>
    </Drawer>
  )
}

export default ContractDetailDrawer

