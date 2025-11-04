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
  Modal,
  Row,
  Col,
} from 'antd'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fieldGroups, staticFieldConfigs, getFieldTypeLabel } from '@/utils/fieldMapping'
import {
  getWorkflowConfig,
  updateWorkflowConfig,
  listFieldConfigs,
  createFieldConfig,
  exportFieldConfigs,
} from '@/api/settings'
import type {
  WorkflowConfigResponse,
  FieldConfigResponse,
  FieldConfigCreate,
} from '@/types/settings'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface WorkflowStageFormValue {
  owner_id?: string | null
  assistants?: string[]
  sla_text?: string | null
}

interface WorkflowFormValues {
  stages?: Record<string, WorkflowStageFormValue>
}

interface FieldFormValues {
  key: string
  label: string
  group: string
  type?: 'text' | 'date' | 'number' | 'select'
  width?: number
  editable?: boolean
  required?: boolean
  fixed?: boolean
  options?: string
  description?: string
  order_index?: number
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabParam = searchParams.get('tab') ?? 'workflow'
  const allowedTabs = useMemo(() => new Set(['workflow', 'fields']), [])
  const activeTab = allowedTabs.has(activeTabParam) ? activeTabParam : 'workflow'

  const [fieldForm] = Form.useForm<FieldFormValues>()
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [exportingFields, setExportingFields] = useState(false)
  const [customFields, setCustomFields] = useState<FieldConfigResponse[]>([])

  const groupedFieldConfigs = useMemo(() => {
    const staticConfigs = staticFieldConfigs.map((item) => ({
      ...item,
      is_custom: false,
      description: undefined,
      fixed: Boolean((item as any).fixed),
    }))

    const mergedMap = new Map<string, (typeof staticConfigs)[number] | FieldConfigResponse>()

    staticConfigs.forEach((item) => {
      mergedMap.set(item.key, item)
    })

    customFields.forEach((item) => {
      mergedMap.set(item.key, item)
    })

    const merged = Array.from(mergedMap.values())

    return Object.entries(fieldGroups).map(([groupKey, groupLabel]) => ({
      key: groupKey,
      label: groupLabel,
      fields: merged
        .filter((config) => config.group === groupKey)
        .sort((a, b) => {
          const aOrder = 'order_index' in a && typeof (a as any).order_index === 'number' ? (a as any).order_index : 1000
          const bOrder = 'order_index' in b && typeof (b as any).order_index === 'number' ? (b as any).order_index : 1000
          return aOrder - bOrder || a.label.localeCompare(b.label)
        }),
    }))
  }, [customFields])

  const customGroupedFields = groupedFieldConfigs

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

  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'workflow') {
      next.delete('tab')
    } else {
      next.set('tab', key)
    }
    setSearchParams(next)
  }

  const workflowTabContent = (
    <Space direction="vertical" size="large" className="w-full">
      <Card className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <Title level={4} className="!mb-1 !text-slate-800">
            合同生命周期节点
          </Title>
          <Text type="secondary">根据标准人事流程梳理节点，可指派负责人并设置 SLA。</Text>
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

    </Space>
  )

  const fetchFieldConfigs = useCallback(async () => {
    setFieldsLoading(true)
    try {
      const response = await listFieldConfigs()
      setCustomFields(response.items)
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn('字段配置接口 404，展示静态默认字段即可')
      } else {
        console.error('Failed to fetch field configs', error)
        messageApi.error('字段配置加载失败，请稍后再试')
      }
    } finally {
      setFieldsLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    fetchFieldConfigs()
  }, [fetchFieldConfigs])

  const handleCreateField = useCallback(async () => {
    try {
      const values = await fieldForm.validateFields()
      const payload: FieldConfigCreate = {
        key: values.key,
        label: values.label,
        group: values.group,
        type: values.type || 'text',
        width: values.width,
        editable: values.editable ?? true,
        required: values.required ?? false,
        fixed: values.fixed ?? false,
        options: values.options?.split(',').map((item) => item.trim()).filter(Boolean),
        order_index: values.order_index,
        description: values.description,
      }
      await createFieldConfig(payload)
      messageApi.success('自定义字段已新增')
      setFieldModalOpen(false)
      fieldForm.resetFields()
      fetchFieldConfigs()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('Create field failed', error)
      messageApi.error(error?.response?.data?.detail ?? '新增字段失败，请稍后再试')
    }
  }, [fieldForm, fetchFieldConfigs, messageApi])

  const handleExportFields = useCallback(async () => {
    try {
      setExportingFields(true)
      const blob = await exportFieldConfigs()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `field-config-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      messageApi.success('字段配置已导出')
    } catch (error) {
      console.error('Export field configs failed', error)
      messageApi.error('导出失败，请稍后再试')
    } finally {
      setExportingFields(false)
    }
  }, [messageApi])

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
          <Button type="default" onClick={handleExportFields} loading={exportingFields}>
            导出字段配置
          </Button>
          <Button type="primary" ghost onClick={() => setFieldModalOpen(true)}>
            新增自定义字段
          </Button>
        </Space>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {customGroupedFields.map((group) => (
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
            {fieldsLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : group.fields.length ? (
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
                        {'is_custom' in field && field.is_custom ? <Tag color="green">自定义</Tag> : null}
                      </Space>
                    </div>
                    <Text className="text-xs text-slate-500">字段编码：{field.key}</Text>
                    {'description' in field && field.description ? (
                      <Text className="block text-xs text-slate-400">{(field as any).description}</Text>
                    ) : null}
                  </div>
                ))}
              </Space>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-sm text-slate-500">
                当前分组暂无字段
              </div>
            )}
          </Card>
        ))}
      </div>
    </Space>
  )

  const tabItems = useMemo(
    () => [
      {
        key: 'workflow',
        label: '审批流程配置',
        children: workflowTabContent,
      },
      {
        key: 'fields',
        label: '字段配置管理',
        children: fieldsTabContent,
      },
    ],
    [workflowTabContent, fieldsTabContent],
  )

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
      <Modal
        open={fieldModalOpen}
        title="新增自定义字段"
        okText="确认新增"
        cancelText="取消"
        onOk={handleCreateField}
        onCancel={() => {
          setFieldModalOpen(false)
          fieldForm.resetFields()
        }}
      >
        <Form<FieldFormValues>
          form={fieldForm}
          layout="vertical"
          initialValues={{
            group: 'other',
            type: 'text',
            editable: true,
            required: false,
            fixed: false,
            order_index: 1000,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<FieldFormValues>
                name="key"
                label="字段编码"
                tooltip="仅允许字母开头，支持字母、数字和下划线"
                rules={[
                  { required: true, message: '请输入字段编码' },
                  {
                    pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段编码需以字母开头，仅包含字母数字下划线',
                  },
                ]}
              >
                <Input placeholder="例如 teacher_specialty" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldFormValues>
                name="label"
                label="字段名称"
                rules={[{ required: true, message: '请输入字段名称' }]}
              >
                <Input placeholder="例如 特长" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<FieldFormValues>
                name="group"
                label="所属分组"
                rules={[{ required: true, message: '请选择分组' }]}
              >
                <Select
                  options={Object.entries(fieldGroups).map(([key, label]) => ({ value: key, label }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldFormValues> name="type" label="字段类型">
                <Select
                  options={[
                    { value: 'text', label: '文本' },
                    { value: 'number', label: '数字' },
                    { value: 'date', label: '日期' },
                    { value: 'select', label: '下拉选项' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<FieldFormValues> name="width" label="列宽 (可选)" tooltip="用于表格显示的宽度">
                <InputNumber min={80} max={400} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldFormValues> name="order_index" label="排序权重" tooltip="值越小越靠前">
                <InputNumber min={1} max={2000} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<FieldFormValues>
                shouldUpdate={(prev, next) => prev.type !== next.type}
                noStyle
              >
                {({ getFieldValue }) => (
                  <Form.Item<FieldFormValues>
                    name="options"
                    label="下拉选项 (逗号分隔)"
                    rules={
                      getFieldValue('type') === 'select'
                        ? [{ required: true, message: '下拉字段需设置选项' }]
                        : undefined
                    }
                  >
                    {getFieldValue('type') === 'select' ? (
                      <Input placeholder="例如：小学部,初中部,高中部" />
                    ) : (
                      <Input disabled placeholder="仅当类型为下拉选项时填写" />
                    )}
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item<FieldFormValues> name="editable" label="可编辑" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item<FieldFormValues> name="required" label="必填" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item<FieldFormValues> name="fixed" label="固定列" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item<FieldFormValues> name="description" label="字段说明">
            <Input.TextArea rows={3} placeholder="用于说明字段用途或填报规范" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Settings

