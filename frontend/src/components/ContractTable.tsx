import { useMemo, useState, useEffect, useCallback } from 'react'
import type { Key } from 'react'
import { Table, Input, Button, Popconfirm, DatePicker, Select, Space, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TableProps } from 'antd'
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Contract, ContractApprovalStatus } from '@/types/contract'
import { useDeleteContract, useUpdateContract } from '@/hooks/useContracts'
import { staticFieldConfigs } from '@/utils/fieldMapping'
import { formatDate } from '@/utils/date'
import ContractDetailDrawer from '@/components/ContractDetailDrawer'
import { useContractLifecycle } from '@/hooks/useContracts'
import { useContractsStore } from '@/store/contractsStore'

interface ContractTableProps {
  data: Contract[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onSelectionChange?: (keys: Key[], rows: Contract[]) => void
}

const CONTRACT_EXPIRING_THRESHOLD_DAYS = 30


const approvalStatusMeta: Record<ContractApprovalStatus, { label: string; color: string }> = {
  approved: { label: '已通过', color: 'green' },
  pending: { label: '待审批', color: 'gold' },
  in_progress: { label: '审批中', color: 'blue' },
  returned: { label: '已退回', color: 'red' },
}

const ContractTable = ({ data, loading, pagination, onSelectionChange }: ContractTableProps) => {
  const [editingKey, setEditingKey] = useState<string>('')
  const [editingField, setEditingField] = useState<string>('')
  const updateMutation = useUpdateContract()
  const deleteMutation = useDeleteContract()
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentContract, setCurrentContract] = useState<Contract | null>(null)
  const [selectedLifecycleId, setSelectedLifecycleId] = useState<string>('')
  const { lifecycleDetail, setLifecycleDetail, lifecycleSummary } = useContractsStore()
  const { isFetching: lifecycleFetching, refetch: refetchLifecycle } = useContractLifecycle(selectedLifecycleId)

  useEffect(() => {
    setSelectedRowKeys([])
  }, [data])

  const displayColumns = useMemo(() => {
    const primaryKeys = [
      'teacher_code',
      'name',
      'department',
      'position',
      'job_status',
      'phone_number',
      'contract_start',
      'contract_end',
      'ocr_confidence',
    ] as const

    return primaryKeys
      .map((key) => staticFieldConfigs.find((config) => config.key === key))
      .filter((config): config is typeof staticFieldConfigs[number] => Boolean(config))
  }, [])

  const handleViewDetail = useCallback((record: Contract) => {
    setCurrentContract(record)
    setDetailVisible(true)
    setLifecycleDetail(null)
    setSelectedLifecycleId(record.id)
  }, [setLifecycleDetail])

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false)
    setCurrentContract(null)
    setSelectedLifecycleId('')
  }, [])

  // 判断单元格是否在编辑状态
  const isEditing = (record: Contract, field: string) => {
    return record.id === editingKey && field === editingField
  }

  // 保存编辑
  const handleSave = async (id: string, field: string, value: any) => {
    await updateMutation.mutateAsync({
      id,
      data: { [field]: value },
    })
    setEditingKey('')
    setEditingField('')
  }

  // 渲染可编辑单元格
  const renderEditableCell = (
    value: any,
    record: Contract,
    config: typeof staticFieldConfigs[0]
  ) => {
    const editing = isEditing(record, config.key)
    const lowConfidenceSet = new Set(record.low_confidence_fields ?? [])
    
    // 置信度低的字段高亮
    const isLowConfidence = lowConfidenceSet.has(config.key) || (record.ocr_confidence < 0.8 && lowConfidenceSet.size === 0)
    const isExpiringSoon = (() => {
      if (config.key !== 'contract_end' || !record.contract_end) return false
      const endDate = dayjs(record.contract_end)
      if (!endDate.isValid()) return false
      const today = dayjs().startOf('day')
      if (endDate.isBefore(today)) return false
      return endDate.diff(today, 'day') <= CONTRACT_EXPIRING_THRESHOLD_DAYS
    })()

    const cellClassNames = [
      isLowConfidence ? 'low-confidence' : '',
      isExpiringSoon ? 'contract-expiring' : '',
    ]
      .filter(Boolean)
      .join(' ')

    if (!config.editable) {
      return <div className={cellClassNames}>{value || '-'}</div>
    }

    if (editing) {
      // 根据类型渲染不同的编辑器
      if (config.type === 'date') {
        return (
          <DatePicker
            defaultValue={value ? dayjs(value) : undefined}
            onChange={(date) => {
              if (!date) return
              handleSave(record.id, config.key, date.format('YYYY-MM-DD'))
            }}
            autoFocus
            style={{ width: '100%' }}
          />
        )
      }

      if (config.type === 'select' && config.options) {
        return (
          <Select
            defaultValue={value}
            options={config.options.map((opt) => ({ label: opt, value: opt }))}
            onChange={(selected) => handleSave(record.id, config.key, selected)}
            autoFocus
            style={{ width: '100%' }}
            onBlur={() => {
              setEditingKey('')
              setEditingField('')
            }}
          />
        )
      }

      if (config.type === 'number') {
        return (
          <Input
            type="number"
            defaultValue={value}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleSave(record.id, config.key, Number(e.target.value))}
            onPressEnter={(e: React.KeyboardEvent<HTMLInputElement>) => handleSave(record.id, config.key, Number((e.target as HTMLInputElement).value))}
            autoFocus
          />
        )
      }

      return (
        <Input
          defaultValue={value}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleSave(record.id, config.key, e.target.value)}
          onPressEnter={(e: React.KeyboardEvent<HTMLInputElement>) => handleSave(record.id, config.key, (e.target as HTMLInputElement).value)}
          autoFocus
        />
      )
    }

    return (
      <div
        className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${cellClassNames}`}
        onClick={() => {
          setEditingKey(record.id)
          setEditingField(config.key)
        }}
      >
        {config.type === 'date' ? formatDate(value) : value || '-'}
      </div>
    )
  }

  // 生成表格列
  const columns: ColumnsType<Contract> = [
    ...displayColumns.map(config => ({
      title: config.label,
      dataIndex: config.key,
      key: config.key,
      width: config.width,
      ellipsis: true,
      render: (value: any, record: Contract) => renderEditableCell(value, record, config),
    })),
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      key: 'approval_status',
      width: 120,
      render: (value: ContractApprovalStatus) => {
        const meta = approvalStatusMeta[value]
        return <Tag color={meta?.color || 'default'}>{meta?.label || '未知'}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: Contract) => (
        <Space size={8}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          <Popconfirm
            title="确定删除该合同吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const rowSelection: TableProps<Contract>['rowSelection'] = {
    selectedRowKeys,
    onChange: (keys: Key[], rows) => {
      setSelectedRowKeys(keys)
      onSelectionChange?.(keys, rows)
    },
  }

  return (
    <>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={
          pagination
            ? {
                ...pagination,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }
            : false
        }
        scroll={{ x: 'max-content', y: 600 }}
        sticky={{ offsetHeader: 0 }}
        bordered
        size="middle"
        className="ledger-table-wrapper rounded-2xl border-white/60 bg-white/95 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
      />
      <ContractDetailDrawer
        open={detailVisible}
        contract={currentContract}
        onClose={handleCloseDetail}
        lifecycleDetail={lifecycleDetail}
        lifecycleSummary={lifecycleSummary}
        lifecycleLoading={lifecycleFetching}
        onRefreshLifecycle={() => {
          refetchLifecycle()
        }}
      />
    </>
  )
}

export default ContractTable

