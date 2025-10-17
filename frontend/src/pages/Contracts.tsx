import { Space, Card, Typography } from 'antd'
import UploadContract from '@/components/UploadContract'

const { Title } = Typography

const Contracts = () => {
  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-r from-blue-600/95 via-blue-500/92 to-sky-500/92 p-8 text-white shadow-[0_24px_60px_rgba(37,99,235,0.28)]">
        <div className="absolute -right-20 -top-14 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-52 w-52 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="text-sm uppercase tracking-[0.35em] text-white/70">BAYUN CONTRACT CENTER</div>
            <Title level={2} className="!mb-0 !text-white !tracking-wide">
              白云实验学校（暨实校区） · 教师合同档案库
            </Title>
            <p className="text-white/85 leading-7">
              聚合教师基础信息、合同要素、资格资质于一体，支持 OCR 智能识别、置信度提示与双击快速修订。所有档案均由白云实验学校人事处统一管理。
            </p>
          </div>
          <div className="grid gap-4 text-sm">
            <div className="rounded-2xl border border-white/40 bg-white/15 px-4 py-2 backdrop-blur">
              • 本月已归档合同 32 份，其中新区教师 6 份
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/15 px-4 py-2 backdrop-blur">
              • OCR 自动识别平均置信度 92%，待复核 3 份
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/15 px-4 py-2 backdrop-blur">
              • 支持一键导出 Excel、批量提醒续签
            </div>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <UploadContract />

      <Card className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
        <Title level={4}>操作指引</Title>
        <div className="mt-2 space-y-2 text-slate-500">
          <p>① 上传合同扫描件 → 系统自动触发 OCR 识别。</p>
          <p>② 在“合同台账”模块查看识别结果，并完成筛选、修订与导出。</p>
          <p>③ 识别置信度不足 80% 的字段会高亮标记，方便人工复核。</p>
        </div>
      </Card>
    </Space>
  )
}

export default Contracts

