import { Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useUploadContract } from '@/hooks/useContracts'

const { Dragger } = Upload

const UploadContract = () => {
  const uploadMutation = useUploadContract()

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
      
      uploadMutation.mutate(file)
      return false
    },
    showUploadList: false,
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_25px_60px_rgba(37,99,235,0.08)] border border-blue-50">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sky-100 opacity-60 blur-xl" />
      <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-200 opacity-40 blur-3xl" />
      <div className="relative grid gap-6 p-10 md:grid-cols-2">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-blue-50/80 px-4 py-2 text-sm font-medium text-blue-600">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            白云实验学校 · 合同档案上传中心
          </div>
          <h2 className="text-3xl font-semibold text-slate-800">上传教师合同，开启智能识别流程</h2>
          <p className="text-slate-500 leading-7">
            支持 PDF、JPG、PNG 格式，自动完成 OCR 字段识别与校验。所有档案均存放于加密存储，保障白云实验学校教师隐私安全。
          </p>
          <div className="flex flex-wrap gap-3">
            {['智能识别', '字段校验', '加密存储', '进度提醒'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-blue-200 bg-white/80 px-4 py-1 text-sm font-medium text-blue-600 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Dragger
            {...uploadProps}
            className="rounded-2xl border-blue-200 bg-white/70 py-12 backdrop-blur-sm"
            style={{ borderStyle: 'dashed' }}
          >
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-blue-500">
                <InboxOutlined />
              </span>
              <p className="text-xl font-semibold text-slate-700">拖放或点击上传文件</p>
              <p className="text-sm text-slate-500">
                支持 PDF、JPG、PNG 格式的合同扫描件，单个文件不超过 10MB
              </p>
              <p className="text-sm text-blue-500 font-medium">上传后将自动进行 OCR 识别并生成字段</p>
            </div>
          </Dragger>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
              数据存储符合白云实验学校人事档案规范
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
              OCR 置信度低于 80% 自动标记“待复核”
            </div>
            <div className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
              支持批量导出 Excel 与合同状态追踪
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadContract

