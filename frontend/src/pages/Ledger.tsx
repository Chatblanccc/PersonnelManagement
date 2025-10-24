import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Card, Space, Button, Input, Select, Dropdown, Divider } from 'antd'
import { useSearchParams } from 'react-router-dom'
import {
  DownloadOutlined,
  SearchOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import ContractTable from '@/components/ContractTable'
import { useContracts, useExportContracts, useImportContracts, useDownloadTemplate } from '@/hooks/useContracts'
import { useContractsStore } from '@/store/contractsStore'
import type { ContractQuery, Contract } from '@/types/contract'
import { notifyError } from '@/utils/message'
const { Search } = Input

const departmentOptions = [
  { label: '全部部门', value: undefined },
  { label: '小学部', value: '小学部' },
  { label: '初中部', value: '初中部' },
  { label: '高中部', value: '高中部' },
  { label: '行政部', value: '行政部' },
]

const statusOptions = [
  { label: '全部状态', value: undefined },
  { label: '在职', value: '在职' },
  { label: '离职', value: '离职' },
  { label: '试用期', value: '试用期' },
]

const approvalStatusOptions = [
  { label: '仅显示已通过', value: 'approved' },
  { label: '全部审批状态', value: 'all' },
  { label: '待审批', value: 'pending' },
  { label: '审批中', value: 'in_progress' },
  { label: '已退回', value: 'returned' },
]

const Ledger = () => {
  const { filters, setFilters, pagination, setPagination } = useContractsStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchText, setSearchText] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    const filterPreset = searchParams.get('filter')
    if (filterPreset === 'expiringSoon' && !filters.expiring_within_days) {
      const mergedFilters = {
        ...filters,
        expiring_within_days: 30,
        approval_status: filters.approval_status ?? 'approved',
      }
      setFilters(mergedFilters)
      setPagination({ page: 1 })
    }
  }, [filters, searchParams, setFilters, setPagination])

  const queryParams = useMemo<ContractQuery>(
    () => ({
      page: pagination.page,
      page_size: pagination.page_size,
      ...filters,
    }),
    [pagination.page, pagination.page_size, filters],
  )

  const { data, isLoading, refetch } = useContracts(queryParams)
  const contracts = (data?.data || []) as Contract[]
  const exportMutation = useExportContracts()
  const importMutation = useImportContracts()
  const downloadTemplateMutation = useDownloadTemplate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value || undefined, expiring_within_days: undefined })
    setPagination({ page: 1 })
  }

  const handleExport = () => {
    exportMutation.mutate({
      ...queryParams,
      ids: selectedIds.length ? selectedIds : undefined,
    })
  }

  const handleImportFile = useCallback(
    (file?: File | null) => {
      if (!file) return

      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'

      if (!isExcel) {
        notifyError('请上传 Excel 文件 (.xlsx /.xls)')
        return
      }

      importMutation.mutate(file, {
        onSuccess: () => {
          refetch()
        },
      })
    },
    [importMutation, refetch]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    handleImportFile(file)
    event.target.value = ''
  }

  const menuItems = useMemo(
    () => [
      {
        key: 'download-template',
        label: '下载导入模板',
        icon: <FileExcelOutlined />,
        disabled: downloadTemplateMutation.isPending,
      },
    ],
    [downloadTemplateMutation.isPending]
  )

  const onMenuClick = ({ key }: { key: string }) => {
    if (key === 'download-template') {
      downloadTemplateMutation.mutate()
    }
  }

  return (
    <Space direction="vertical" size="large" className="w-full">

      <Card className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
        <Space direction="vertical" size="large" className="w-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Search
              placeholder="搜索姓名、工号、部门..."
              allowClear
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ maxWidth: 320 }}
            />
            <Space size={16} wrap>
          <Select
            placeholder="部门筛选"
            style={{ width: 160 }}
            value={filters.department}
            options={departmentOptions}
            onChange={(value) => {
              setFilters({ ...filters, department: value })
              setPagination({ page: 1 })
              setSelectedIds([])
            }}
            allowClear
          />
          <Select
            placeholder="在职状态"
            style={{ width: 160 }}
            value={filters.job_status}
            options={statusOptions}
            onChange={(value) => {
              setFilters({ ...filters, job_status: value })
              setPagination({ page: 1 })
              setSelectedIds([])
            }}
            allowClear
          />
          <Select
            placeholder="审批状态"
            style={{ width: 160 }}
            value={filters.approval_status ?? 'approved'}
            options={approvalStatusOptions}
            onChange={(value) => {
              setFilters({ ...filters, approval_status: value as typeof filters.approval_status })
              setPagination({ page: 1 })
              setSelectedIds([])
            }}
          />
          <Select
            placeholder="到期预警"
            style={{ width: 180 }}
            value={filters.expiring_within_days}
            options={[
              { label: '全部期限', value: undefined },
              { label: '30 天内到期', value: 30 },
              { label: '60 天内到期', value: 60 },
              { label: '90 天内到期', value: 90 },
            ]}
            onChange={(value) => {
              setFilters({ ...filters, expiring_within_days: value ?? undefined })
              setPagination({ page: 1 })
              setSelectedIds([])
              if (!value) {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('filter')
                  return next
                }, { replace: true })
              } else if (!searchParams.get('filter')) {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('filter', 'expiringSoon')
                  return next
                }, { replace: true })
              }
            }}
            allowClear
          />
              <Space size={12}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  loading={exportMutation.isPending}
                >
                  导出台账
                </Button>
                <Dropdown.Button
                  type="default"
                  icon={<UploadOutlined />}
                  menu={{ items: menuItems, onClick: onMenuClick }}
                  loading={importMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  导入 Excel
                </Dropdown.Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleFileChange}
                  disabled={importMutation.isPending}
                />
              </Space>
            </Space>
          </div>

          <Divider dashed className="!my-2" />

          <ContractTable
            data={contracts}
            loading={isLoading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.page_size,
              total: pagination.total,
              onChange: (page, pageSize) => setPagination({ page, page_size: pageSize }),
            }}
            onSelectionChange={(keys) => {
              setSelectedIds(keys.map((key) => String(key)))
            }}
          />
        </Space>
      </Card>
    </Space>
  )
}

export default Ledger

