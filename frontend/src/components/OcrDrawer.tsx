import { Drawer, Descriptions, Tag, Space, Button, Typography } from 'antd'
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useContractsStore } from '@/store/contractsStore'
import { useCreateContract } from '@/hooks/useContracts'
import { fieldConfigs } from '@/utils/fieldMapping'
import { formatDate } from '@/utils/date'

const { Title, Paragraph, Text } = Typography

const OcrDrawer = () => {
  const { ocrResult, showOcrDrawer, setShowOcrDrawer, setOcrResult } = useContractsStore()
  const createMutation = useCreateContract()

  const handleClose = () => {
    setShowOcrDrawer(false)
    setOcrResult(null)
  }

  const handleSave = async () => {
    if (!ocrResult) return
    
    await createMutation.mutateAsync(ocrResult.contract)
    handleClose()
  }

  if (!ocrResult) return null

  const { contract, confidence, raw_text } = ocrResult

  // 按置信度分类字段
  const lowConfidenceFields = Object.entries(confidence)
    .filter(([_, conf]) => conf < 0.8)
    .map(([field]) => field)

  const getFieldValue = (key: string) => {
    const value = contract[key as keyof typeof contract]
    if (!value) return '-'
    
    const config = fieldConfigs.find(f => f.key === key)
    if (config?.type === 'date') {
      return formatDate(value as string)
    }
    
    return String(value)
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'green'
    if (conf >= 0.8) return 'blue'
    if (conf >= 0.6) return 'orange'
    return 'red'
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
            暨实校区 · OCR 自动识别结果，低置信度字段已高亮
          </Text>
        </div>
      }
      width={720}
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
      {/* 识别统计 */}
      <Space direction="vertical" size="large" className="w-full">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: '平均置信度',
              value: `${(
                (Object.values(confidence).reduce((a, b) => a + b, 0) /
                  Object.values(confidence).length) *
                100
              ).toFixed(1)}%`,
              gradient: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(56,189,248,0.92))',
              subtitle: 'PaddleOCR v3.0 自动识别',
            },
            {
              label: '识别字段数',
              value: Object.keys(contract).length,
              gradient: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.9))',
              subtitle: '与合同标准字段一一对应',
            },
            {
              label: '低置信度字段',
              value: lowConfidenceFields.length,
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
 
        {/* 低置信度警告 */}
        {lowConfidenceFields.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="relative">
              <Space>
                <WarningOutlined className="text-amber-600" />
                <div>
                  <Text strong>以下字段识别置信度较低，建议人工核对：</Text>
                  <div className="mt-2">
                    {lowConfidenceFields.map(field => {
                      const config = fieldConfigs.find(f => f.key === field)
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

        {/* 识别结果 */}
        <div>
          <Title level={5} className="!text-slate-700">
            识别结果
          </Title>
          <Descriptions bordered column={1} size="small" className="overflow-hidden rounded-2xl">
            {fieldConfigs.map(config => {
              const value = getFieldValue(config.key)
              const conf = confidence[config.key]
              const isLowConfidence = conf && conf < 0.8

              if (!contract[config.key as keyof typeof contract]) return null

              return (
                <Descriptions.Item
                  key={config.key}
                  label={
                    <Space>
                      {config.label}
                      {conf !== undefined && (
                        <Tag color={getConfidenceColor(conf)} icon={isLowConfidence ? <WarningOutlined /> : <CheckCircleOutlined />}>
                          {(conf * 100).toFixed(0)}%
                        </Tag>
                      )}
                    </Space>
                  }
                  className={isLowConfidence ? 'low-confidence' : ''}
                >
                  {value}
                </Descriptions.Item>
              )
            })}
          </Descriptions>
        </div>

        {/* 原始文本 */}
        <div>
          <Title level={5} className="!text-slate-700">
            原始识别文本
          </Title>
          <Paragraph className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
            {raw_text}
          </Paragraph>
        </div>
      </Space>
    </Drawer>
  )
}

export default OcrDrawer

