import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import * as contractsApi from '@/api/contracts'
import type { ImportContractsResponse } from '@/api/contracts'
import type {
  Contract,
  ContractQuery,
  OcrResult,
  ContractLifecycleDetail,
  CreateTimelineEventPayload,
} from '@/types/contract'
import { useContractsStore } from '@/store/contractsStore'
import { notifySuccess, notifyError } from '@/utils/message'

// 获取合同列表
export const useContracts = (query: ContractQuery) => {
  const { setContracts, setPagination } = useContractsStore()
  
  const normalizedQuery = useMemo<ContractQuery>(() => ({
    approval_status: 'approved',
    ...query,
  }), [query])

  return useQuery({
    queryKey: ['contracts', normalizedQuery],
    queryFn: async () => {
      const response = await contractsApi.getContracts(normalizedQuery)
      setContracts(response.data)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
      })
      return response
    },
  })
}

// 获取合同生命周期详情
export const useContractLifecycle = (id: string) => {
  const { setLifecycleDetail, setLifecycleLoading, setLifecycleSummary } = useContractsStore()

  return useQuery<ContractLifecycleDetail, Error>({
    queryKey: ['contract-lifecycle', id],
    queryFn: async () => {
      try {
        setLifecycleLoading(true)
        const data = await contractsApi.getContractLifecycle(id)
        setLifecycleDetail(data)
        setLifecycleSummary(data.summary ?? null)
        return data
      } catch (error) {
        notifyError('获取合同生命周期数据失败，请稍后重试')
        throw error
      } finally {
        setLifecycleLoading(false)
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

// 获取单个合同
export const useContract = (id: string) => {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.getContract(id),
    enabled: !!id,
  })
}

// 更新合同
export const useUpdateContract = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) =>
      contractsApi.updateContract(id, data),
    onSuccess: () => {
      notifySuccess('保存成功')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => {
      notifyError('保存失败，请重试')
    },
  })
}

// 删除合同
export const useDeleteContract = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: contractsApi.deleteContract,
    onSuccess: () => {
      notifySuccess('删除成功')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => {
      notifyError('删除失败，请重试')
    },
  })
}

// 导出合同
export const useExportContracts = () => {
  return useMutation({
    mutationFn: contractsApi.exportContracts,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contracts_${new Date().getTime()}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      notifySuccess('导出成功')
    },
    onError: () => {
      notifyError('导出失败，请重试')
    },
  })
}

// 导入合同 Excel
export const useImportContracts = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: contractsApi.importContracts,
    onSuccess: (res: ImportContractsResponse) => {
      notifySuccess(`成功导入 ${res.imported} 条合同记录`)
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      if (typeof detail === 'string') {
        notifyError(detail)
      } else if (Array.isArray(detail)) {
        notifyError(`导入失败：${detail.join('; ')}`)
      } else {
        notifyError('导入失败，请检查文件格式后重试')
      }
    },
  })
}

// 下载合同导入模板
export const useDownloadTemplate = () => {
  return useMutation({
    mutationFn: contractsApi.downloadTemplate,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '合同导入模板.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      notifySuccess('模板下载成功')
    },
    onError: () => {
      notifyError('模板下载失败，请重试')
    },
  })
}

// 上传合同并触发 OCR
export const useUploadContract = () => {
  const queryClient = useQueryClient()
  const { setOcrResult, setShowOcrDrawer, setLowConfidenceFields, setUploadStatus, resetUploadStatus } = useContractsStore()

  return useMutation({
    mutationFn: async (file: File) =>
      contractsApi.uploadContract(file, {
        onUploadProgress: (percent) => {
          setUploadStatus({
            stage: percent >= 100 ? 'processing' : 'uploading',
            percent,
            message: percent >= 100 ? '上传完成，正在进行 OCR 识别…' : `正在上传合同文件（${percent}%）`,
          })
        },
      }),
    onMutate: () => {
      resetUploadStatus()
      setUploadStatus({ stage: 'uploading', percent: 0, message: '正在上传合同文件…' })
    },
    onSuccess: (result: OcrResult) => {
      notifySuccess('识别完成，正在展示 OCR 结果')
      setUploadStatus({ stage: 'success', percent: 100, message: '识别完成，结果已生成' })
      setOcrResult(result)
      setLowConfidenceFields(result.low_confidence_fields ?? [])
      setShowOcrDrawer(true)
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      const detail = error.response?.data?.detail
      const message = typeof detail === 'string' ? detail : '上传失败，请重试'
      setUploadStatus({ stage: 'error', percent: 0, message })
      notifyError(message)
    },
  })
}

// 保存 OCR 结果为合同记录
export const useCreateContract = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, originalFilename }: { data: Partial<Contract>; originalFilename?: string }) =>
      contractsApi.createContract(data, originalFilename),
    onSuccess: () => {
      notifySuccess('审批流程已发起，审批通过后合同将自动进入台账')
      queryClient.invalidateQueries({ queryKey: ['approval-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['approval-overview'] })
      queryClient.invalidateQueries({ queryKey: ['approval-stage-summary'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },

    onError: (error: any) => {
      // 从错误响应中提取友好的错误信息
      const errorMessage = error?.response?.data?.detail || error?.message || '合同保存失败，请重试'
      notifyError(errorMessage)
    },
  })
}

export const useCreateTimelineEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: CreateTimelineEventPayload }) =>
      contractsApi.createContractTimelineEvent(contractId, data),
    onSuccess: (_data, variables) => {
      notifySuccess('生命周期事件已创建')
      queryClient.invalidateQueries({ queryKey: ['contract-lifecycle', variables.contractId] })
    },
    onError: () => {
      notifyError('新增生命周期事件失败，请稍后重试')
    },
  })
}

export const useDeleteTimelineEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contractId, eventId }: { contractId: string; eventId: string }) =>
      contractsApi.deleteContractTimelineEvent(contractId, eventId),
    onSuccess: (_data, variables) => {
      notifySuccess('已删除生命周期事件')
      queryClient.invalidateQueries({ queryKey: ['contract-lifecycle', variables.contractId] })
    },
    onError: () => {
      notifyError('删除生命周期事件失败，请稍后重试')
    },
  })
}

export const useUploadContractAttachment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contractId, file, name }: { contractId: string; file: File; name?: string }) =>
      contractsApi.uploadContractAttachment(contractId, file, { name }),
    onSuccess: (_data, variables) => {
      notifySuccess('附件上传成功')
      queryClient.invalidateQueries({ queryKey: ['contract-lifecycle', variables.contractId] })
    },
    onError: () => {
      notifyError('附件上传失败，请稍后重试')
    },
  })
}

export const useDeleteContractAttachment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contractId, attachmentId }: { contractId: string; attachmentId: string }) =>
      contractsApi.deleteContractAttachment(contractId, attachmentId),
    onSuccess: (_data, variables) => {
      notifySuccess('附件已删除')
      queryClient.invalidateQueries({ queryKey: ['contract-lifecycle', variables.contractId] })
    },
    onError: () => {
      notifyError('删除附件失败，请稍后重试')
    },
  })
}

export const useDownloadContractAttachment = () => {
  return useMutation({
    mutationFn: ({ contractId, attachmentId }: { contractId: string; attachmentId: string }) =>
      contractsApi.downloadContractAttachment(contractId, attachmentId),
  })
}

