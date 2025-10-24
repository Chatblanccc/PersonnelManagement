import { create } from 'zustand'
import type {
  Contract,
  ContractApprovalStatus,
  DashboardStats,
  OcrResult,
  ContractLifecycleDetail,
  ContractLifecycleSummary,
} from '@/types/contract'

interface ContractsState {
  contracts: Contract[]
  setContracts: (contracts: Contract[]) => void

  filters: {
    department?: string
    job_status?: string
    search?: string
    approval_status?: ContractApprovalStatus | 'all'
    expiring_within_days?: number
  }
  setFilters: (filters: ContractsState['filters']) => void

  pagination: {
    page: number
    page_size: number
    total: number
  }
  setPagination: (pagination: Partial<ContractsState['pagination']>) => void

  dashboardStats?: DashboardStats
  setDashboardStats: (stats: DashboardStats | undefined) => void

  ocrResult: OcrResult | null
  setOcrResult: (result: OcrResult | null) => void
  showOcrDrawer: boolean
  setShowOcrDrawer: (show: boolean) => void

  lifecycleDetail: ContractLifecycleDetail | null
  setLifecycleDetail: (detail: ContractLifecycleDetail | null) => void
  lifecycleLoading: boolean
  setLifecycleLoading: (loading: boolean) => void
  lifecycleSummary: ContractLifecycleSummary | null
  setLifecycleSummary: (summary: ContractLifecycleSummary | null) => void
}

export const useContractsStore = create<ContractsState>((set) => ({
  contracts: [],
  setContracts: (contracts) => set({ contracts }),

  filters: { approval_status: 'approved' },
  setFilters: (filters) => set({ filters }),

  pagination: {
    page: 1,
    page_size: 20,
    total: 0,
  },
  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  dashboardStats: undefined,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  ocrResult: null,
  setOcrResult: (result) => set({ ocrResult: result }),
  showOcrDrawer: false,
  setShowOcrDrawer: (show) => set({ showOcrDrawer: show }),

  lifecycleDetail: null,
  setLifecycleDetail: (detail) => set({ lifecycleDetail: detail }),
  lifecycleLoading: false,
  setLifecycleLoading: (loading) => set({ lifecycleLoading: loading }),
  lifecycleSummary: null,
  setLifecycleSummary: (summary) => set({ lifecycleSummary: summary }),
}))

