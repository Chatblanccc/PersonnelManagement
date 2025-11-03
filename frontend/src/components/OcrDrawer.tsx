import { useEffect, useMemo, useState } from 'react'
import { Drawer, Descriptions, Tag, Space, Button, Typography, Input, DatePicker, Select, InputNumber, Alert } from 'antd'
import { CheckCircleOutlined, WarningOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

import { useContractsStore } from '@/store/contractsStore'
import { useCreateContract } from '@/hooks/useContracts'
import { staticFieldConfigs } from '@/utils/fieldMapping'
import { formatDate } from '@/utils/date'
import type { Contract } from '@/types/contract'

const { Title, Paragraph, Text } = Typography

const CONFIDENCE_THRESHOLD = 0.8

const getConfidenceColor = (conf: number) => {
  if (conf >= 0.9) return 'green'
  if (conf >= 0.8) return 'blue'
  if (conf >= 0.6) return 'orange'
  return 'red'
}

const OcrDrawer = () => {
  const {
    ocrResult,
    showOcrDrawer,
    setShowOcrDrawer,
    setOcrResult,
    lowConfidenceFields,
    setLowConfidenceFields,
    resetUploadStatus,
  } = useContractsStore()
  const createMutation = useCreateContract()

  const [editableContract, setEditableContract] = useState<Partial<Contract>>({})
  const [editingField, setEditingField] = useState<string | null>(null)

  useEffect(() => {
    if (ocrResult) {
      setEditableContract({ ...ocrResult.contract })
      setLowConfidenceFields(ocrResult.low_confidence_fields ?? [])
    } else {
      setEditableContract({})
      setLowConfidenceFields([])
    }
  }, [ocrResult, setLowConfidenceFields])

  const confidence = ocrResult?.confidence ?? {}
  const rawText = ocrResult?.raw_text ?? ''

  const lowConfidenceSet = useMemo(() => {
    const fields = lowConfidenceFields.length ? lowConfidenceFields : ocrResult?.low_confidence_fields ?? []
    return new Set(fields)
  }, [lowConfidenceFields, ocrResult?.low_confidence_fields])

  const averageConfidence = useMemo(() => {
    const values = Object.values(confidence)
    if (!values.length) return 0
    return values.reduce((sum, item) => sum + item, 0) / values.length
  }, [confidence])

  const handleClose = () => {
    setShowOcrDrawer(false)
    setOcrResult(null)
    setEditableContract({})
    setLowConfidenceFields([])
    setEditingField(null)
    resetUploadStatus()
  }

  const handleFieldCommit = (key: string, value: unknown) => {
    if (!ocrResult) return

    const updatedContract = { ...editableContract, [key]: value }
    setEditableContract(updatedContract)

    const shouldRemoveFromLowConfidence = lowConfidenceSet.has(key)
    const nextLowConfidence = shouldRemoveFromLowConfidence
      ? lowConfidenceFields.filter((item) => item !== key)
      : lowConfidenceFields

    if (shouldRemoveFromLowConfidence) {
      setLowConfidenceFields(nextLowConfidence)
    }

    setOcrResult({
      ...ocrResult,
      contract: { ...ocrResult.contract, [key]: value },
      low_confidence_fields: nextLowConfidence,
    })

    setEditingField(null)
  }

  const handleSave = async () => {
    if (!ocrResult) return
    await createMutation.mutateAsync({
      data: editableContract,
      originalFilename: ocrResult.original_filename,
    })
    handleClose()
  }

  const renderValueDisplay = (configKey: string, value: unknown): string => {
    const config = staticFieldConfigs.find((item) => item.key === configKey)
    if (!config) return String(value ?? '-')

    if (config.type === 'date') {
      return value ? formatDate(value as string) : '-'
    }

    return String(value ?? '-')
  }

  const renderEditor = (configKey: string, value: unknown) => {
    const config = staticFieldConfigs.find((item) => item.key === configKey)
    if (!config) return null

    switch (config.type) {
      case 'date': {
        const parsed = value ? dayjs(value as string) : null
        return (
          <DatePicker
            autoFocus
            value={parsed as Dayjs | null}
            style={{ width: '100%' }}
            onChange={(date) => handleFieldCommit(config.key, date ? date.format('YYYY-MM-DD') : null)}
            onOpenChange={(open) => {
              if (!open) {
                setEditingField(null)
              }
            }}
          />
        )
      }
      case 'select': {
        return (
          <Select
            autoFocus
            defaultValue={value as string | undefined}
            options={(config.options ?? []).map((option) => ({ label: option, value: option }))}
            onChange={(selected) => handleFieldCommit(config.key, selected)}
            onBlur={() => setEditingField(null)}
          />
        )
      }
      case 'number': {
        return (
          <InputNumber
            autoFocus
            defaultValue={typeof value === 'number' ? value : value ? Number(value) : undefined}
            style={{ width: '100%' }}
            onBlur={(event) => {
              const targetValue = (event.target as HTMLInputElement).value
              const numeric = targetValue ? Number(targetValue) : null
              handleFieldCommit(config.key, numeric)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const numeric = Number((event.target as HTMLInputElement).value)
                handleFieldCommit(config.key, Number.isNaN(numeric) ? null : numeric)
              }
            }}
          />
        )
      }
      default: {
        return (
          <Input
            autoFocus
            defaultValue={value as string | undefined}
            onBlur={(event) => handleFieldCommit(config.key, event.target.value || null)}
            onPressEnter={(event) => handleFieldCommit(config.key, (event.target as HTMLInputElement).value || null)}
          />
        )
      }
    }
  }

  if (!ocrResult) {
    return null
  }

  return (
    <Drawer
      title={
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-[0.35em] text-blue-400">BAYUN OCR CENTER</div>
          <Title level={3} className="!mb-0 !text-slate-800">
            白云实验学校 · 合同识别预览
          </Title>
          <Text type="secondary" className="text-sm">
            暨实校区 · OCR 自动识别结果，支持就地修订并同步发起审批
          </Text>
        </div>
      }
      width={760}
      open={showOcrDrawer}
      onClose={handleClose}
      extra={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" onClick={handleSave} loading={createMutation.isPending}>
            确认保存
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" className="w-full">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: '平均置信度',
              value: `${(averageConfidence * 100).toFixed(1)}%`,
              gradient: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(56,189,248,0.92))',
              subtitle: 'PaddleOCR v3.0 自动识别',
            },
            {
              label: '识别字段数',
              value: Object.keys(editableContract).length,
              gradient: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.9))',
              subtitle: '与合同标准字段一一对应',
            },
            {
              label: '待复核字段',
              value: lowConfidenceSet.size,
              gradient: 'linear-gradient(135deg, rgba(251,146,60,0.95), rgba(234,179,8,0.9))',
              subtitle: '建议人工核对确认',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/60 p-5 text-white shadow-[0_18px_30px_rgba(37,99,235,0.18)]"
              style={{ background: item.gradient }}
            >
              <div className="text-xs uppercase tracking-[0.35em] text-white/70">BAYUN OCR</div>
              <div className="mt-3 text-2xl font-semibold">{item.value}</div>
              <div className="mt-2 text-xs text-white/80">{item.subtitle}</div>
            </div>
          ))}
        </div>

        {ocrResult.contract.file_url && (
          <Alert
            type="info"
            showIcon
            message="合同扫描件已加密入库"
            description={
              <div className="text-xs text-slate-600">
                加密路径：{ocrResult.contract.file_url}
              </div>
            }
          />
        )}

        {lowConfidenceSet.size > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=60)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative">
              <Space>
                <WarningOutlined className="text-amber-600" />
                <div>
                  <Text strong>以下字段置信度较低，请完成人工确认：</Text>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(lowConfidenceSet).map((field) => {
                      const config = staticFieldConfigs.find((item) => item.key === field)
                      return (
                        <Tag key={field} color="warning" className="mb-1">
                          {config?.label || field}
                        </Tag>
                      )
                    })}
                  </div>
                </div>
              </Space>
            </div>
          </div>
        )}

        <div>
          <Title level={5} className="!text-slate-700">
            识别结果（双击字段即可编辑）
          </Title>
          <Descriptions bordered column={1} size="small" className="overflow-hidden rounded-2xl">
            {staticFieldConfigs.map((config) => {
              const value = editableContract[config.key as keyof Contract]
              if (value === undefined || value === null || value === '') return null

              const fieldConfidence = confidence[config.key]
              const isLowConfidence = lowConfidenceSet.has(config.key) || (fieldConfidence !== undefined && fieldConfidence < CONFIDENCE_THRESHOLD)

              return (
                <Descriptions.Item
                  key={config.key}
                  label={
                    <Space>
                      {config.label}
                      {fieldConfidence !== undefined && (
                        <Tag
                          color={getConfidenceColor(fieldConfidence)}
                          icon={isLowConfidence ? <WarningOutlined /> : <CheckCircleOutlined />}
                        >
                          {(fieldConfidence * 100).toFixed(0)}%
                        </Tag>
                      )}
                    </Space>
                  }
                  className={isLowConfidence ? 'low-confidence' : undefined}
                >
                  {editingField === config.key ? (
                    renderEditor(config.key, value)
                  ) : (
                    <div
                      className={`flex items-center justify-between gap-3 ${isLowConfidence ? 'text-amber-700' : ''}`}
                      onDoubleClick={() => setEditingField(config.key)}
                    >
                      <span>{renderValueDisplay(config.key, value)}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingField(config.key)}
                      >
                        编辑
                      </Button>
                    </div>
                  )}
                </Descriptions.Item>
              )
            })}
          </Descriptions>
        </div>

        <div>
          <Title level={5} className="!text-slate-700">
            原始识别文本
          </Title>
          <Paragraph className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
            {rawText}
          </Paragraph>
        </div>
      </Space>
    </Drawer>
  )
}

export default OcrDrawer

