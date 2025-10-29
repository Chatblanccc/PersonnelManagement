import { Space, Card, Typography } from 'antd'
import UploadContract from '@/components/UploadContract'
import OcrDrawer from '@/components/OcrDrawer'

const { Title } = Typography

const Contracts = () => {
  return (
    <Space direction="vertical" size="large" className="w-full">

      {/* 上传区域 */}
      <UploadContract />

      {/* OCR 识别结果抽屉 */}
      <OcrDrawer />

      <Card className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
        <Title level={4}>操作指引</Title>
        <div className="mt-2 space-y-2 text-slate-500">
          <p>① 上传合同扫描件 → 系统自动触发 OCR 识别。</p>
          <p>② 在"合同台账"模块查看识别结果，并完成筛选、修订与导出。</p>
          <p>③ 识别置信度不足 80% 的字段会高亮标记，方便人工复核。</p>
        </div>
      </Card>
    </Space>
  )
}

export default Contracts

