import { useEffect } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import { getDashboardStats, getDashboardSummary } from '@/api/contracts'
import type { DashboardStats, SidebarSummary } from '@/types/contract'
import { useContractsStore } from '@/store/contractsStore'
import { useAuthStore } from '@/store/authStore'

const DASHBOARD_STATS_QUERY_KEY = ['dashboard-stats'] as const
const DASHBOARD_SIDEBAR_QUERY_KEY = ['dashboard-sidebar-summary'] as const

type DashboardStatsOptions = Omit<
  UseQueryOptions<DashboardStats, Error, DashboardStats, typeof DASHBOARD_STATS_QUERY_KEY>,
  'queryKey' | 'queryFn'
>

export const useDashboardStats = (options?: DashboardStatsOptions) => {
  const dashboardStatsInStore = useContractsStore((state) => state.dashboardStats)
  const setDashboardStats = useContractsStore((state) => state.setDashboardStats)
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasAuditPermission = useAuthStore((state) => state.hasPermission('contracts.audit'))
  const canFetch = Boolean(accessToken) && hasAuditPermission

  const queryResult = useQuery<DashboardStats, Error, DashboardStats, typeof DASHBOARD_STATS_QUERY_KEY>({
    queryKey: DASHBOARD_STATS_QUERY_KEY,
    queryFn: getDashboardStats,
    staleTime: 60_000,
    gcTime: 60_000,
    ...(dashboardStatsInStore ? { initialData: dashboardStatsInStore } : {}),
    ...options,
    enabled: canFetch && (options?.enabled ?? true),
  })

  useEffect(() => {
    if (queryResult.isSuccess) {
      setDashboardStats(queryResult.data)
    }

    if (queryResult.isError) {
      setDashboardStats(undefined)
    }
  }, [queryResult.data, queryResult.isError, queryResult.isSuccess, setDashboardStats])

  useEffect(() => {
    if (!canFetch) {
      setDashboardStats(undefined)
    }
  }, [canFetch, setDashboardStats])

  return queryResult
}

export const useDashboardStatsFromStore = () => {
  return useContractsStore((state) => state.dashboardStats)
}

export const useSidebarSummary = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasAuditPermission = useAuthStore((state) => state.hasPermission('contracts.audit'))
  const canFetch = Boolean(accessToken) && hasAuditPermission

  return useQuery<SidebarSummary, Error, SidebarSummary, typeof DASHBOARD_SIDEBAR_QUERY_KEY>({
    queryKey: DASHBOARD_SIDEBAR_QUERY_KEY,
    queryFn: getDashboardSummary,
    staleTime: 60_000,
    enabled: canFetch,
  })
}
