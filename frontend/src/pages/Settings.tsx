import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Tabs,
  Steps,
  Tag,
  Divider,
  Form,
  Switch,
  InputNumber,
  Select,
  Input,
  message,
  Spin,
} from 'antd'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { FieldConfig } from '@/utils/fieldMapping'
import { fieldGroups, fieldConfigs, sensitiveFields } from '@/utils/fieldMapping'
import { getWorkflowConfig, updateWorkflowConfig } from '@/api/settings'
import type { WorkflowConfigResponse } from '@/types/settings'

const { Title, Text } = Typography

interface OcrFormValues {
  enableBatch: boolean
  autoSplitPdf: boolean
  lowConfidenceThreshold: number
  notifyChannels: string[]
  selectedModel: string
  excelTemplate: string
  regexProfile: string
  doubleCheckFields: string[]
  reviewQueueDaily: number
}

interface WorkflowStageFormValue {
  owner_id?: string | null
  assistants?: string[]
  sla_text?: string | null
}

interface WorkflowFormValues {
  stages?: Record<string, WorkflowStageFormValue>
}

const notificationChannelOptions = [
  { label: '企业微信', value: 'wechat' },
  { label: '邮件', value: 'email' },
  { label: '短信', value: 'sms' },
]

const ocrModelOptions = [
  { label: 'PaddleOCR v4 · 中文通用', value: 'paddle_ocr_v4' },
  { label: 'PaddleOCR v3 · 轻量模型', value: 'paddle_ocr_v3' },
]

const excelTemplateOptions = [
  { label: '教师合同模板 · 标准版', value: 'default_contract' },
  { label: '教师合同模板 · 精简版', value: 'lite_contract' },
  { label: '教师合同模板 · 国际部', value: 'international_contract' },
]

const getFieldTypeLabel = (type?: FieldConfig['type']) => {
  switch (type) {
    case 'date':
      return '日期'
    case 'number':
      return '数字'
    case 'select':
      return '下拉选项'
    default:
      return '文本'
  }
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'workflow'

  const groupedFieldConfigs = useMemo(
    () =>
      Object.entries(fieldGroups).map(([groupKey, groupLabel]) => ({
        key: groupKey,
        label: groupLabel,
        fields: fieldConfigs.filter((config) => config.group === groupKey),
      })),
    [],
  )

  const sensitiveFieldOptions = useMemo(
    () =>
      sensitiveFields.map((fieldKey) => {
        const found = fieldConfigs.find((item) => item.key === fieldKey)
        return {
          label: found?.label ?? fieldKey,
          value: fieldKey,
        }
      }),
    [],
  )

  const defaultOcrConfig: OcrFormValues = useMemo(
    () => ({
      enableBatch: true,
      autoSplitPdf: true,
      lowConfidenceThreshold: 0.8,
      notifyChannels: ['wechat', 'email'],
      selectedModel: 'paddle_ocr_v4',
      excelTemplate: 'default_contract',
      regexProfile: '白云实验学校 · 合同要素正则模板 V1',
      doubleCheckFields: ['id_number', 'phone_number', 'address'],
      reviewQueueDaily: 30,
    }),
    [],
  )

  const [messageApi, contextHolder] = message.useMessage()
  const queryClient = useQueryClient()
  const [workflowForm] = Form.useForm<WorkflowFormValues>()
  const {
    data: workflowConfig,
    isLoading: workflowLoading,
  } = useQuery<WorkflowConfigResponse>({
    queryKey: ['workflow-config'],
    queryFn: getWorkflowConfig,
  })

  const populateWorkflowForm = useCallback(
    (config: WorkflowConfigResponse) => {
      const stageValues = config.stages.reduce<Record<string, WorkflowStageFormValue>>((acc, stage) => {
        acc[stage.key] = {
          owner_id: stage.owner_id ?? null,
          assistants: stage.assistants ?? [],
          sla_text: stage.sla_text ?? '',
        }
        return acc
      }, {})
      workflowForm.setFieldsValue({ stages: stageValues })
    },
    [workflowForm],
  )

  useEffect(() => {
    if (workflowConfig) {
      populateWorkflowForm(workflowConfig)
    }
  }, [workflowConfig, populateWorkflowForm])

  const workflowStages = workflowConfig?.stages ?? []
  const availableUsers = workflowConfig?.available_users ?? []

  const userOptions = useMemo(
    () =>
      availableUsers.map((user) => ({
        label: user.full_name ? `${user.full_name} (${user.username})` : user.username,
        value: user.id,
      })),
    [availableUsers],
  )

  const reminderSummaries = useMemo(
    () =>
      (workflowConfig?.stages ?? []).flatMap((stage) =>
        (stage.reminders ?? []).map((reminder, index) => {
          const ownerLabel = stage.owner?.full_name || stage.owner?.username || '待指派'
          const timing =
            reminder.offset_days === 0
              ? '当日提醒'
              : reminder.offset_days > 0
                ? `事件后 ${reminder.offset_days} 天`
                : `提前 ${Math.abs(reminder.offset_days)} 天`
          return {
            key: `${stage.key}-${index}`,
            stageName: stage.name,
            timing,
            owner: ownerLabel,
            channels: reminder.channels,
            notes: reminder.notes,
          }
        }),
      ),
    [workflowConfig],
  )

  const saveWorkflowMutation = useMutation({
    mutationFn: updateWorkflowConfig,
    onSuccess: async (data) => {
      queryClient.setQueryData(['workflow-config'], data)
      populateWorkflowForm(data)
      await queryClient.invalidateQueries({ queryKey: ['workflow-config'] })
      messageApi.success('Workflow configuration saved')
    },
    onError: () => {
      messageApi.error('Failed to save workflow configuration. Please try again later.')
    },
  })

  const savingWorkflow = saveWorkflowMutation.isPending

  const handleWorkflowSubmit = () => {
    if (!workflowConfig) {
      return
    }
    const updates = workflowConfig.stages
      .map((stage) => {
        const formOwnerId = workflowForm.getFieldValue(['stages', stage.key, 'owner_id'])
        const formAssistants = workflowForm.getFieldValue(['stages', stage.key, 'assistants'])
        const formSlaText = workflowForm.getFieldValue(['stages', stage.key, 'sla_text'])

        const resolvedOwner =
          formOwnerId !== undefined ? (formOwnerId === '' ? null : formOwnerId) : stage.owner_id ?? null
        const resolvedAssistants =
          formAssistants !== undefined ? formAssistants : stage.assistants ?? []
        const resolvedSlaText =
          formSlaText !== undefined ? (formSlaText === '' ? null : formSlaText) : stage.sla_text ?? null

        const assistantsChanged = JSON.stringify(resolvedAssistants) !== JSON.stringify(stage.assistants ?? [])
        const hasChanges =
          resolvedOwner !== (stage.owner_id ?? null) || 
          assistantsChanged ||
          resolvedSlaText !== (stage.sla_text ?? null)

        if (!hasChanges) {
          return null
        }

        return {
          key: stage.key,
          owner_id: resolvedOwner,
          assistants: resolvedAssistants,
          sla_text: resolvedSlaText,
        }
      })
      .filter((item): item is { key: string; owner_id: string | null; assistants: string[]; sla_text: string | null } => Boolean(item))

    if (!updates.length) {
      messageApi.info('No workflow changes detected')
      return
    }

    console.debug('Submitting workflow updates', updates)
    saveWorkflowMutation.mutate({ stages: updates })
  }

  const handleWorkflowReset = () => {
    if (workflowConfig) {
      populateWorkflowForm(workflowConfig)
    } else {
      workflowForm.resetFields()
    }
  }

  const [ocrForm] = Form.useForm<OcrFormValues>()
  const [ocrPreview, setOcrPreview] = useState<OcrFormValues>(defaultOcrConfig)
  const [savingOcr, setSavingOcr] = useState(false)

  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'workflow') {
      next.delete('tab')
    } else {
      next.set('tab', key)
    }
    setSearchParams(next)
  }

  const handleSaveOcrConfig = async (values: OcrFormValues) => {
    try {
      setSavingOcr(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setOcrPreview(values)
      messageApi.success('OCR 配置已保存（示例操作）')
    } finally {
      setSavingOcr(false)
    }
  }

  const handleResetOcrConfig = () => {
    ocrForm.setFieldsValue(defaultOcrConfig)
    setOcrPreview(defaultOcrConfig)
    messageApi.info('已恢复默认 OCR 配置模板')
  }

  const workflowTabContent = (
    <Space direction="vertical" size="large" className="w-full">
      <Card className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Title level={4} className="!mb-1 !text-slate-800">
              合同生命周期节点
            </Title>
            <Text type="secondary">根据标准人事流程梳理节点，可指派负责人并设置 SLA。</Text>
          </div>
          <Button type="primary" ghost disabled>
            新增流程阶段
          </Button>
        </div>
        <Divider className="!my-4" />
        <Steps
          current={workflowStages.length ? workflowStages.length - 1 : 0}
          responsive
          items={workflowStages.map((stage) => ({
            title: stage.name,
            description: stage.owner?.full_name || stage.owner?.username || '待指派',
          }))}
        />
      </Card>

      {workflowLoading ? (
        <Card className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/60 bg-white/90">
          <Spin size="large" />
        </Card>
      ) : (
        <Form form={workflowForm} layout="vertical" onFinish={handleWorkflowSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workflowStages.map((stage) => (
              <Card
                key={stage.id}
                className="h-full rounded-2xl border border-white/60 bg-white/90 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-blue-400">CONTRACT FLOW</div>
                    <Title level={5} className="!mb-1 !mt-2 !text-slate-800">
                      {stage.name}
                    </Title>
                  </div>
                  <Tag color={stage.owner ? 'processing' : 'warning'}>
                    {stage.owner?.full_name || stage.owner?.username || '待指派'}
                  </Tag>
                </div>
                {stage.description ? (
                  <Text className="mt-2 block text-sm text-slate-600">{stage.description}</Text>
                ) : null}
                <Divider className="!my-3" />
                <Form.Item label="负责人" name={['stages', stage.key, 'owner_id']}>
                  <Select
                    allowClear
                    placeholder="选择负责人"
                    options={userOptions}
                    disabled={savingWorkflow || !userOptions.length}
                    onChange={(value) => {
                      console.debug(`Stage ${stage.key} owner changed:`, value)
                    }}
                  />
                </Form.Item>
                <Form.Item 
                  label="协助人" 
                  name={['stages', stage.key, 'assistants']}
                  tooltip="协助人可以代替负责人进行审批操作"
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="选择协助人（可选）"
                    options={userOptions}
                    disabled={savingWorkflow || !userOptions.length}
                    maxTagCount="responsive"
                  />
                </Form.Item>
                <Form.Item label="SLA 描述" name={['stages', stage.key, 'sla_text']}>
                  <Input placeholder="例如：T+2 工作日完成" />
                </Form.Item>
                {stage.checklist?.length ? (
                  <>
                    <Divider className="!my-3" />
                    <Space direction="vertical" size={8} className="w-full">
                      {stage.checklist.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-600">
                          · {item}
                        </div>
                      ))}
                    </Space>
                  </>
                ) : null}
              </Card>
            ))}
            {workflowStages.length === 0 ? (
              <Card className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-slate-500">
                暂无流程阶段，请在后端配置默认流程。
              </Card>
            ) : null}
          </div>
          <Space className="mt-4">
            <Button type="primary" htmlType="submit" loading={savingWorkflow} disabled={!workflowStages.length}>
              保存流程配置
            </Button>
            <Button onClick={handleWorkflowReset} disabled={savingWorkflow || !workflowStages.length}>
              重置
            </Button>
          </Space>
        </Form>
      )}

      <Card className="rounded-2xl border border-amber-100 bg-amber-50/70 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Title level={5} className="!mb-1 !text-amber-700">
              提醒策略与升级路线
            </Title>
            <Text className="text-sm text-amber-700/80">
              支持企业微信、短信、邮件等多渠道提醒，确保试用评估与续签节点准时完成。
            </Text>
          </div>
          <Button type="primary" disabled>
            配置提醒策略
          </Button>
        </div>
        <Divider className="!my-4" />
        {reminderSummaries.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {reminderSummaries.map((plan) => (
              <div
                key={plan.key}
                className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-700">{plan.stageName}</div>
                  <Tag color="processing">{plan.owner}</Tag>
                </div>
                <div className="mt-2 text-xs text-slate-500">{plan.timing}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.channels.map((channel) => (
                    <Tag key={channel} color="blue">
                      {channel.toUpperCase()}
                    </Tag>
                  ))}
                </div>
                {plan.notes ? <div className="mt-2 text-xs text-slate-500">{plan.notes}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 px-4 py-6 text-center text-sm text-amber-700/80">
            当前流程尚未配置提醒策略。
          </div>
        )}
      </Card>
    </Space>
  )
const fieldsTabContent = (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={4} className="!mb-1 !text-slate-800">
            字段模型维护
          </Title>
          <Text type="secondary">字段需与数据库模型保持一致，修改后请同步数据库与 Excel 模板。</Text>
        </div>
        <Space size={12} wrap>
          <Button type="default">导出字段配置</Button>
          <Button type="primary" ghost>
            新增自定义字段
          </Button>
        </Space>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groupedFieldConfigs.map((group) => (
          <Card
            key={group.key}
            className="rounded-2xl border border-white/60 bg-white/92 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
          >
            <div className="flex items-center justify-between gap-2">
              <Title level={5} className="!mb-0 !text-slate-800">
                {group.label}
              </Title>
              <Tag color="blue">{group.fields.length} 项</Tag>
            </div>
            <Divider className="!my-3" />
            <Space direction="vertical" size={10} className="w-full">
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">{field.label}</span>
                    <Space size={6} wrap>
                      <Tag color="cyan">{getFieldTypeLabel(field.type)}</Tag>
                      {field.editable ? <Tag color="geekblue">可编辑</Tag> : <Tag>只读</Tag>}
                      {field.required ? <Tag color="red">必填</Tag> : null}
                      {field.fixed ? <Tag color="purple">固定列</Tag> : null}
                    </Space>
                  </div>
                  <Text className="text-xs text-slate-500">字段编码：{field.key}</Text>
                </div>
              ))}
            </Space>
          </Card>
        ))}
      </div>
    </Space>
  )

  const ocrTabContent = (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={4} className="!mb-1 !text-slate-800">
            OCR 引擎配置
          </Title>
          <Text type="secondary">配置 PaddleOCR 参数、置信度阈值、批量任务与复核策略。</Text>
        </div>
        <Button type="link" onClick={handleResetOcrConfig}>
          恢复默认模板
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-2xl border border-white/60 bg-white/95 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
          <Form<OcrFormValues>
            form={ocrForm}
            layout="vertical"
            initialValues={defaultOcrConfig}
            onValuesChange={(_, allValues) => setOcrPreview(allValues)}
            onFinish={handleSaveOcrConfig}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Form.Item<OcrFormValues>
                name="selectedModel"
                label="OCR 模型"
                rules={[{ required: true, message: '请选择 OCR 模型' }]}
              >
                <Select options={ocrModelOptions} placeholder="请选择 OCR 模型" />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="lowConfidenceThreshold"
                label="低置信度阈值"
                tooltip="低于此阈值的字段将标记为待复核"
                rules={[{ required: true, message: '请设置低置信度阈值' }]}
              >
                <InputNumber<number>
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                  formatter={(value) =>
                    value !== undefined && value !== null
                      ? `${Math.round(Number(value) * 100)}%`
                      : ''
                  }
                  parser={(value) => Number((value ?? '').replace('%', '')) / 100}
                />
              </Form.Item>
              <Form.Item<OcrFormValues> name="enableBatch" label="启用批量任务" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item<OcrFormValues> name="autoSplitPdf" label="自动拆分 PDF" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="notifyChannels"
                label="提醒渠道"
                rules={[{ required: true, message: '请选择提醒渠道' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择提醒渠道"
                  options={notificationChannelOptions}
                  allowClear
                />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="reviewQueueDaily"
                label="每日复核容量"
                tooltip="系统每日分配的人工复核上限"
              >
                <InputNumber min={10} max={100} step={5} className="w-full" suffix="份" />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="excelTemplate"
                label="导出模板"
                rules={[{ required: true, message: '请选择导出模板' }]}
              >
                <Select options={excelTemplateOptions} placeholder="请选择导出模板" />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="regexProfile"
                label="正则解析模板"
                rules={[{ required: true, message: '请输入正则解析模板名称' }]}
              >
                <Input placeholder="例如：白云实验学校 · 合同要素正则模板" />
              </Form.Item>
              <Form.Item<OcrFormValues>
                name="doubleCheckFields"
                label="强制人工复核字段"
                tooltip="即使置信度达标也需要人工确认的敏感字段"
              >
                <Select mode="multiple" options={sensitiveFieldOptions} allowClear />
              </Form.Item>
            </div>

            <Divider className="!my-4" />
            <Space>
              <Button type="primary" htmlType="submit" loading={savingOcr}>
                保存配置
              </Button>
              <Button onClick={() => ocrForm.submit()} disabled={savingOcr}>
                测试识别任务
              </Button>
            </Space>
          </Form>
        </Card>

        <Card className="rounded-2xl border border-blue-100 bg-blue-50/70 shadow-sm">
          <Title level={5} className="!mb-2 !text-blue-700">
            执行摘要
          </Title>
          <Divider className="!my-3 !border-blue-200" />
          <Space direction="vertical" size={10} className="w-full text-sm text-blue-900/80">
            <div>低置信度阈值：{Math.round((ocrPreview.lowConfidenceThreshold ?? 0.8) * 100)}%</div>
            <div>批量任务：{ocrPreview.enableBatch ? '已启用' : '未启用'}</div>
            <div>PDF 自动拆分：{ocrPreview.autoSplitPdf ? '开启' : '关闭'}</div>
            <div>提醒渠道：{(ocrPreview.notifyChannels ?? []).map((channel) => notificationChannelOptions.find((opt) => opt.value === channel)?.label ?? channel).join(' · ') || '未设置'}</div>
            <div>每日复核容量：{ocrPreview.reviewQueueDaily ?? 30} 份</div>
            <div>强制复核字段：{(ocrPreview.doubleCheckFields ?? []).map((fieldKey) => fieldConfigs.find((item) => item.key === fieldKey)?.label ?? fieldKey).join(' · ') || '未设置'}</div>
            <div>当前模型：{ocrModelOptions.find((opt) => opt.value === ocrPreview.selectedModel)?.label ?? '未选择'}</div>
            <div>导出模板：{excelTemplateOptions.find((opt) => opt.value === ocrPreview.excelTemplate)?.label ?? '默认模板'}</div>
          </Space>
        </Card>
      </div>
    </Space>
  )

  const tabItems = [
    { key: 'workflow', label: '流程配置', children: workflowTabContent },
    { key: 'fields', label: '字段配置', children: fieldsTabContent },
    { key: 'ocr', label: 'OCR 设置', children: ocrTabContent },
  ]

  return (
    <>
      {contextHolder}
      <div className="space-y-6">
      {/* <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-r from-slate-900 via-blue-900 to-sky-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.45)]">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1400&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-blue-900/80 to-sky-900/80" />
        <div className="relative grid gap-6 p-10 md:grid-cols-2">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/20 px-4 py-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              SYSTEM CONTROL CENTER
            </div>
            <Title level={2} className="!mb-2 !text-white">
              白云实验学校 · 系统配置中心
            </Title>
            <p className="leading-7 text-white/80">
              管理 OCR 引擎、字段配置、合同生命周期流程与提醒策略，确保教师合同档案全链路可控，符合白云实验学校（暨实校区）的人事规范与隐私要求。
            </p>
          </div>
          <div className="rounded-3xl border border-white/30 bg-white/10 p-6 backdrop-blur">
            <div className="text-sm uppercase tracking-[0.3em] text-white/60">STATUS</div>
            <ul className="mt-4 space-y-3 text-sm">
              <li>• OCR 服务在线 · PaddleOCR v3/v4</li>
              <li>• 数据库连接 · PostgreSQL /personnel_management</li>
              <li>• 加密引擎 · AES-256-GCM · 正常运行</li>
              <li>• Supabase 存储 · 密钥有效 · 访问正常</li>
            </ul>
          </div>
        </div>
      </Card> */}

      <Card className="rounded-3xl border border-white/60 bg-white/90 shadow-[0_20px_50px_rgba(37,99,235,0.12)]">
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} animated destroyOnHidden={false} />
      </Card>
      </div>
    </>
  )
}

export default Settings

