import { Upload, message, Typography, Space, Progress, Alert, Spin, Card, Steps, Divider, Tag } from 'antd'
import { InboxOutlined, SafetyCertificateOutlined, FilePdfOutlined, FileImageOutlined, AuditOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useUploadContract } from '@/hooks/useContracts'
import { useState, useMemo } from 'react'
import { useContractsStore } from '@/store/contractsStore'

const { Dragger } = Upload
const { Text, Title, Paragraph } = Typography

const UploadContract = () => {
  const uploadMutation = useUploadContract()
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null)
  const { uploadStatus, ocrResult } = useContractsStore()

  const isProcessing = uploadStatus.stage === 'uploading' || uploadStatus.stage === 'processing'
  const progressStatus = uploadStatus.stage === 'error'
    ? 'exception'
    : uploadStatus.stage === 'success'
      ? 'success'
      : 'active'

  const formattedSize = useMemo(() => {
    if (!currentFile) return ''
    const sizeInMb = currentFile.size / 1024 / 1024
    if (sizeInMb < 1) {
      return `${(currentFile.size / 1024).toFixed(1)} KB`
    }
    return `${sizeInMb.toFixed(2)} MB`
  }, [currentFile])

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.jpg,.jpeg,.png',
    beforeUpload: (file) => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type)
      if (!isValidType) {
        message.error('只能上传 PDF 或图片文件！')
        return Upload.LIST_IGNORE
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！')
        return Upload.LIST_IGNORE
      }
      
      setCurrentFile({ name: file.name, size: file.size })
      uploadMutation.mutate(file)
      return false
    },
    showUploadList: false,
    disabled: isProcessing,
  }

  return (
    <section className="grid gap-6 md:grid-cols-[320px,1fr]">
      <Card
        className="h-full border-slate-200 shadow-sm"
        title={
          <div className="flex items-center gap-2 text-base font-semibold text-slate-700">
            <AuditOutlined className="text-blue-500" />
            上传与审核流程提示
          </div>
        }
      >
        <Steps
          direction="vertical"
          size="small"
          current=
            {uploadStatus.stage === 'idle'
              ? 0
              : uploadStatus.stage === 'uploading'
                ? 1
                : uploadStatus.stage === 'processing'
                  ? 2
                  : uploadStatus.stage === 'success'
                    ? 3
                    : uploadStatus.stage === 'error'
                      ? 1
                      : 0}
          items={[
            {
              title: '准备材料',
              description: '确保扫描件清晰、完整，建议 300dpi 以上分辨率。',
            },
            {
              title: '上传文件',
              description: '拖拽或点击选择合同 PDF/JPG/PNG，系统自动完成上传与校验。',
            },
            {
              title: '进行识别',
              description: 'PaddleOCR 自动解析 40+ 字段，低置信度字段将标记提醒复核。',
            },
            {
              title: '确认并归档',
              description: '在识别结果抽屉中核对字段，确认后即可进入审批与台账。',
            },
          ]}
        />

        <Divider className="my-5" />

        <Space direction="vertical" size="large" className="w-full text-sm text-slate-600">
          <div>
            <Title level={5} className="!mb-2 !text-slate-700">
              上传要求
            </Title>
            <Space direction="vertical" size={4}>
              <span className="flex items-center gap-2">
                <FilePdfOutlined className="text-blue-500" /> 支持 PDF、JPG、PNG、JPEG，单个文件 ≤ 10MB
              </span>
              <span className="flex items-center gap-2">
                <FileImageOutlined className="text-blue-500" /> 建议使用原始扫描件，避免拍照导致的反光与倾斜
              </span>
              <span className="flex items-center gap-2">
                <SafetyCertificateOutlined className="text-blue-500" /> 身份证号、手机号等敏感信息将自动加密存储
              </span>
            </Space>
          </div>

          <div>
            <Title level={5} className="!mb-2 !text-slate-700">
              识别结果说明
            </Title>
            <Paragraph className="!mb-0 text-sm text-slate-500">
              上传完成后系统会自动打开 OCR 结果抽屉，可随时编辑字段。低置信度字段以 <Tag color="warning">待复核</Tag> 标记，编辑后会自动移除标记。
            </Paragraph>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            已识别的合同会保留最新一次字段校验记录。如需重新上传，只需再次选择文件，系统会自动覆盖上一版本识别结果。
          </div>
        </Space>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <Space direction="vertical" size={16} className="w-full">
          <div>
            <Title level={4} className="!mb-1 !text-slate-800">
              合同扫描件上传
            </Title>
            <Paragraph className="!mb-0 text-sm text-slate-500">
              拖拽或点击选择文件，上传过程与识别进度将实时展示。识别完成后自动打开结果抽屉，便于校验与保存。
            </Paragraph>
          </div>

          <Dragger
            {...uploadProps}
            className="rounded-xl border-dashed border-slate-300 bg-slate-50/60 py-10"
          >
            <Space direction="vertical" align="center" size={8} className="text-slate-600">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-500">
                <InboxOutlined />
              </span>
              <Text strong className="text-base text-slate-700">
                将合同扫描件拖拽到此处，或点击选择文件
              </Text>
              <Text type="secondary" className="text-xs">
                支持单文件上传，命名示例：合同-张三-2024.pdf
              </Text>
              <Tag color="blue">自动识别并高亮置信度低的字段</Tag>
            </Space>
          </Dragger>

          {uploadStatus.stage !== 'idle' && (
            <Card size="small" className="border-blue-200 bg-blue-50/60">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>当前进度</span>
                <span>{uploadStatus.percent}%</span>
              </div>
              <Progress
                percent={uploadStatus.percent}
                status={progressStatus}
                strokeColor={{ from: '#2563eb', to: '#38bdf8' }}
                trailColor="#dbeafe"
                showInfo={false}
              />
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                {isProcessing && <Spin size="small" />}
                <span>{uploadStatus.message}</span>
              </div>
              {uploadStatus.stage === 'error' && uploadStatus.message && (
                <Alert
                  className="mt-3"
                  type="error"
                  showIcon
                  message={uploadStatus.message}
                />
              )}
            </Card>
          )}

          {currentFile && (
            <Card size="small" className="border-slate-200 bg-white">
              <Space direction="vertical" size={0} className="w-full text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <Text strong className="truncate" title={currentFile.name}>
                    {currentFile.name}
                  </Text>
                  <Tag color="default">{formattedSize}</Tag>
                </div>
                <Text type="secondary" className="text-xs">
                  {uploadStatus.stage === 'success'
                    ? '识别完成，已自动打开字段抽屉，请核对后保存。'
                    : uploadStatus.stage === 'error'
                      ? '上传识别失败，请根据提示调整文件后重试。'
                      : '处理中，请勿关闭页面或切换网络。'}
                </Text>
              </Space>
            </Card>
          )}

          <Divider className="!my-2" />

          <Space direction="vertical" size={8} className="text-xs text-slate-500">
            <span>已上传：{currentFile ? currentFile.name : '尚未上传合同文件'}</span>
            <span>识别状态：{(() => {
              switch (uploadStatus.stage) {
                case 'idle':
                  return '等待上传'
                case 'uploading':
                  return '正在上传文件…'
                case 'processing':
                  return '正在进行 OCR 识别…'
                case 'success':
                  return ocrResult ? '识别成功，等待确认' : '识别成功'
                case 'error':
                  return '识别失败，请重试'
                default:
                  return '未知状态'
              }
            })()}</span>
          </Space>
        </Space>
      </Card>
    </section>
  )
}

export default UploadContract

