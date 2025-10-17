import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
  Card,
  Tabs,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  Segmented,
  Tooltip,
  Dropdown,
  MenuProps,
  Empty,
  Spin,
  Modal,
  Input,
  Drawer,
  Progress,
  Steps,
} from "antd"
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  NodeIndexOutlined,
  HistoryOutlined,
  ApartmentOutlined,
  BellOutlined,
  LoadingOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import type { TablePaginationConfig } from "antd/es/table/interface"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"

import {
  getApprovalHistory,
  getApprovalStatsOverview,
  getApprovalTasks,
  approveApprovalTask,
  returnApprovalTask,
  deleteApprovalTask,
  deleteAllApprovalTasksByContract,
  deleteAllApprovalTasksByTeacher,
  sendApprovalReminder,
} from "@/api/contracts"
import type {
  ApprovalHistoryRecord,
  ApprovalStageKey,
  ApprovalStatus,
  ApprovalTask,
  ApprovalTaskQuery,
  ApprovalPriority,
} from "@/types/contract"
import { formatDate } from "@/utils/date"
import { useAuthStore } from "@/store/authStore"
import { notifySuccess, notifyInfo, notifyWarning } from "@/utils/message"
import type { AxiosError } from "axios"
import type { SendReminderResponse } from "@/api/contracts"

const { Text } = Typography

// 教师审批分组类型
interface GroupedTeacherApproval {
  teacher_name: string
  department: string
  contract_id: string
  tasks: ApprovalTask[]
  totalStages: number
  completedStages: number
  pendingStages: number
  returnedStages: number
  highestPriority: ApprovalPriority
  earliestDueDate: string
  overallStatus: 'pending' | 'in_progress' | 'completed' | 'returned'
  hasOperableTask: boolean // 当前用户是否有可操作的任务
}

const stageLabelMap: Record<ApprovalStageKey, string> = {
  entry: "入职准备",
  qualification: "资格审核",
  probation: "试用评估",
  signature: "合同签署",
  renewal: "续签提醒",
  archive: "复核归档",
}

const statusLabelMap: Record<ApprovalStatus, { text: string; color: string; icon: ReactNode }> = {
  pending: { text: "待处理", color: "orange", icon: <ClockCircleOutlined /> },
  in_progress: { text: "处理中", color: "blue", icon: <LoadingOutlined /> },
  completed: { text: "已完成", color: "green", icon: <CheckCircleOutlined /> },
  returned: { text: "已退回", color: "red", icon: <ExclamationCircleOutlined /> },
}

const priorityLabelMap: Record<ApprovalTask["priority"], { text: string; color: string }> = {
  high: { text: "高", color: "red" },
  medium: { text: "中", color: "orange" },
  low: { text: "低", color: "green" },
}

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "已退回", value: "returned" },
]

const ApprovalDashboard = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasAuditPermission = useAuthStore((state) => state.hasPermission("contracts.audit"))
  const currentUser = useAuthStore((state) => state.user)
  const isSuperuser = currentUser?.is_superuser || false
  const canFetch = Boolean(accessToken) && hasAuditPermission
  const [activeStatus, setActiveStatus] = useState<ApprovalStatus | "all">("pending")
  const [activeTabKey, setActiveTabKey] = useState<"tasks" | "overview" | "history">("tasks")
  const [selectedStage, setSelectedStage] = useState<ApprovalStageKey | "all">("all")
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50"],
  })
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [actionTaskId, setActionTaskId] = useState<string | null>(null)
  const [progressDrawerVisible, setProgressDrawerVisible] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<GroupedTeacherApproval | null>(null)
  
  // 获取当前用户标识
  const userIdentifier = currentUser?.full_name || currentUser?.username || ""

  const invalidateApprovalQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["approval-tasks"] })
    await queryClient.invalidateQueries({ queryKey: ["approval-overview"] })
    await queryClient.invalidateQueries({ queryKey: ["approval-stage-summary"] })
  }, [queryClient])

  // 检查用户是否有权限操作任务
  const canUserOperateTask = useCallback((task: ApprovalTask): boolean => {
    if (!userIdentifier) return false
    // 用户是负责人
    if (task.owner === userIdentifier) return true
    // 用户是协作人
    if (task.assignees.includes(userIdentifier)) return true
    return false
  }, [userIdentifier])

  const queryParams = useMemo<ApprovalTaskQuery>(
    () => ({
      status: activeStatus,
      stage: selectedStage,
      page: pagination.current,
      page_size: pagination.pageSize,
      // 当选择"全部节点"时，不按用户过滤（管理视图）
      // 当选择具体节点时，按用户过滤（只看自己负责的任务）
      filter_by_user: selectedStage !== "all",
    }),
    [activeStatus, selectedStage, pagination],
  )

  const tasksQuery = useQuery({
    queryKey: ["approval-tasks", queryParams],
    queryFn: () => getApprovalTasks(queryParams),
    placeholderData: keepPreviousData,
    enabled: canFetch,
    retry: false,
  })

  const overviewQuery = useQuery({
    queryKey: ["approval-overview"],
    queryFn: getApprovalStatsOverview,
    enabled: canFetch,
    retry: false,
  })

  const historyQuery = useQuery({
    queryKey: ["approval-history", selectedTaskId],
    queryFn: () => {
      if (!selectedTaskId) {
        return Promise.resolve([] as ApprovalHistoryRecord[])
      }
      return getApprovalHistory(selectedTaskId)
    },
    enabled: canFetch && Boolean(selectedTaskId),
    retry: false,
  })

  // 分组逻辑：将同一教师的多个审批任务合并
  const groupedTeacherData = useMemo<GroupedTeacherApproval[]>(() => {
    if (!tasksQuery.data?.data) return []
    
    const grouped = new Map<string, GroupedTeacherApproval>()
    
    tasksQuery.data.data.forEach((task) => {
      const key = `${task.contract_id || task.teacher_name}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          teacher_name: task.teacher_name,
          department: task.department,
          contract_id: task.contract_id,
          tasks: [],
          totalStages: 0,
          completedStages: 0,
          pendingStages: 0,
          returnedStages: 0,
          highestPriority: task.priority,
          earliestDueDate: task.due_date,
          overallStatus: 'pending',
          hasOperableTask: false,
        })
      }
      
      const group = grouped.get(key)!
      group.tasks.push(task)
      group.totalStages++
      
      // 检查是否有可操作的任务
      if (canUserOperateTask(task) && (task.status === 'pending' || task.status === 'in_progress')) {
        group.hasOperableTask = true
      }
      
      // 统计各状态数量
      if (task.status === 'completed') {
        group.completedStages++
      } else if (task.status === 'returned') {
        group.returnedStages++
      } else if (task.status === 'pending') {
        group.pendingStages++
      }
      
      // 更新优先级（取最高）
      const priorityLevel = { high: 3, medium: 2, low: 1 }
      if (priorityLevel[task.priority] > priorityLevel[group.highestPriority]) {
        group.highestPriority = task.priority
      }
      
      // 更新最早截止日期
      if (new Date(task.due_date) < new Date(group.earliestDueDate)) {
        group.earliestDueDate = task.due_date
      }
    })
    
    // 计算总体状态
    grouped.forEach((group) => {
      if (group.returnedStages > 0) {
        group.overallStatus = 'returned'
      } else if (group.completedStages === group.totalStages) {
        group.overallStatus = 'completed'
      } else if (group.completedStages > 0 || group.tasks.some(t => t.status === 'in_progress')) {
        group.overallStatus = 'in_progress'
      } else {
        group.overallStatus = 'pending'
      }
    })
    
    return Array.from(grouped.values())
  }, [tasksQuery.data, canUserOperateTask])

  const approveMutation = useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment?: string }) =>
      approveApprovalTask(taskId, comment ? { comment } : undefined),
    onMutate: ({ taskId }) => {
      setActionTaskId(taskId)
    },
    onSuccess: async (_response, variables) => {
      notifySuccess("审批已通过")
      await invalidateApprovalQueries()
      if (variables.taskId === selectedTaskId) {
        await queryClient.invalidateQueries({ queryKey: ["approval-history", variables.taskId] })
      }
    },
    onSettled: () => {
      setActionTaskId(null)
    },
  })

  const returnMutation = useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment?: string }) =>
      returnApprovalTask(taskId, comment ? { comment } : undefined),
    onMutate: ({ taskId }) => {
      setActionTaskId(taskId)
    },
    onSuccess: async (_response, variables) => {
      notifySuccess("退回操作已提交")
      await invalidateApprovalQueries()
      if (variables.taskId === selectedTaskId) {
        await queryClient.invalidateQueries({ queryKey: ["approval-history", variables.taskId] })
      }
    },
    onSettled: () => {
      setActionTaskId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteApprovalTask(taskId),
    onMutate: (taskId) => {
      setActionTaskId(taskId)
    },
    onSuccess: async () => {
      notifySuccess("审批任务已删除")
      await invalidateApprovalQueries()
      // 如果删除的任务正在查看历史，清空选择
      if (selectedTaskId === actionTaskId) {
        setSelectedTaskId(null)
      }
      // 如果在 Drawer 中删除，关闭 Drawer
      if (progressDrawerVisible) {
        setProgressDrawerVisible(false)
        setSelectedTeacher(null)
      }
    },
    onSettled: () => {
      setActionTaskId(null)
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: async ({ contractId, teacherName, department }: { contractId?: string; teacherName?: string; department?: string }) => {
      if (contractId) {
        return await deleteAllApprovalTasksByContract(contractId)
      } else if (teacherName && department) {
        return await deleteAllApprovalTasksByTeacher(teacherName, department)
      }
      throw new Error("Missing parameters")
    },
    onSuccess: async (data) => {
      notifySuccess(`已成功删除 ${data.deleted_count} 个审批任务`)
      await invalidateApprovalQueries()
      // 如果在 Drawer 中删除，关闭 Drawer
      if (progressDrawerVisible) {
        setProgressDrawerVisible(false)
        setSelectedTeacher(null)
      }
    },
  })

  const sendReminderMutation = useMutation<
    SendReminderResponse,
    AxiosError,
    { contractId?: string; teacherName?: string; department?: string }
  >({
    mutationFn: async ({ contractId, teacherName, department }) => {
      return await sendApprovalReminder({
        contractId,
        teacherName,
        department,
      })
    },
    onSuccess: (data) => {
      const reminderCount = data?.notification_count ?? 0
      if (reminderCount <= 1) {
        notifySuccess(data?.message || "提醒发送成功")
      } else {
        notifySuccess(`提醒发送成功，已通知 ${reminderCount} 位负责人`)
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] })
    },
    onError: (error) => {
      const responseData = error.response?.data as { detail?: string; message?: string } | undefined
      const errorMessage = responseData?.detail || responseData?.message || error.message || "发送提醒失败"
      notifyWarning(errorMessage)
    },
  })

  const handleApprove = useCallback(
    (task: ApprovalTask) => {
      Modal.confirm({
        title: "确认通过审批任务",
        content: (
          <div className="space-y-2">
            <div>
              确认通过 {task.teacher_name} 的 {stageLabelMap[task.stage]} 节点审批？
            </div>
            <div className="text-xs text-slate-500">通过后任务将进入完成状态。</div>
          </div>
        ),
        okText: "确认通过",
        cancelText: "取消",
        centered: true,
        onOk: () => approveMutation.mutateAsync({ taskId: task.id }),
      })
    },
    [approveMutation],
  )

  const handleReturn = useCallback(
    (task: ApprovalTask) => {
      let commentValue = ""
      Modal.confirm({
        title: "退回审批任务",
        content: (
          <div className="space-y-3">
            <div>
              请填写退回 {task.teacher_name} 的 {stageLabelMap[task.stage]} 节点原因，系统将记录审批历史。
            </div>
            <Input.TextArea
              rows={4}
              placeholder="请输入退回说明"
              onChange={(event) => {
                commentValue = event.target.value
              }}
            />
          </div>
        ),
        okText: "确认退回",
        cancelText: "取消",
        centered: true,
        onOk: () => {
          if (!commentValue.trim()) {
            notifyWarning("请填写退回说明")
            return Promise.reject()
          }
          return returnMutation.mutateAsync({ taskId: task.id, comment: commentValue.trim() })
        },
      })
    },
    [returnMutation],
  )

  const handleDelete = useCallback(
    (task: ApprovalTask) => {
      Modal.confirm({
        title: "确认删除审批任务",
        content: (
          <div className="space-y-2">
            <div className="text-red-600 font-medium">
              ⚠️ 此操作不可恢复！
            </div>
            <div>
              确认删除 {task.teacher_name} 的 {stageLabelMap[task.stage]} 节点审批任务？
            </div>
            <div className="text-xs text-slate-500">
              删除后，该任务的所有历史记录和核查项也将被删除。
            </div>
          </div>
        ),
        okText: "确认删除",
        okType: "danger",
        cancelText: "取消",
        centered: true,
        onOk: () => deleteMutation.mutateAsync(task.id),
      })
    },
    [deleteMutation],
  )

  const handleDeleteAllWorkflow = useCallback(
    (teacher: GroupedTeacherApproval) => {
      Modal.confirm({
        title: "确认删除整个审批流程",
        content: (
          <div className="space-y-3">
            <div className="text-red-600 font-medium text-base">
              ⚠️ 危险操作：此操作不可恢复！
            </div>
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="font-medium mb-2">您即将删除：</div>
              <div className="text-sm space-y-1">
                <div>• 教师：<strong>{teacher.teacher_name}</strong></div>
                <div>• 部门：<strong>{teacher.department}</strong></div>
                <div>• 审批阶段：<strong className="text-red-600">{teacher.totalStages} 个</strong></div>
                {teacher.contract_id && <div>• 合同编号：{teacher.contract_id}</div>}
              </div>
            </div>
            <div className="text-xs text-slate-600">
              删除后，该教师的所有审批任务、历史记录和核查项都将被永久删除。
            </div>
            <div className="text-xs text-slate-500 italic">
              此操作仅限超级管理员执行。
            </div>
          </div>
        ),
        okText: "确认删除全部",
        okType: "danger",
        cancelText: "取消",
        centered: true,
        width: 520,
        onOk: () => {
          if (teacher.contract_id) {
            return deleteAllMutation.mutateAsync({ contractId: teacher.contract_id })
          } else {
            return deleteAllMutation.mutateAsync({ 
              teacherName: teacher.teacher_name, 
              department: teacher.department 
            })
          }
        },
      })
    },
    [deleteAllMutation],
  )

  const handleViewProgress = useCallback((teacher: GroupedTeacherApproval) => {
    setSelectedTeacher(teacher)
    setProgressDrawerVisible(true)
  }, [])

  const handleMoreAction = useCallback(
    (actionKey: string, teacher: GroupedTeacherApproval, task?: ApprovalTask) => {
      switch (actionKey) {
        case "view-contract":
          if (teacher.contract_id) {
            window.open(`/contracts?contractId=${teacher.contract_id}`, "_blank")
          } else {
            notifyInfo("该审批任务未关联合同信息")
          }
          break
        case "view-progress":
          handleViewProgress(teacher)
          break
        case "remind":
          sendReminderMutation.mutate({
            contractId: teacher.contract_id,
            teacherName: teacher.teacher_name,
            department: teacher.department,
          })
          break
        case "delete":
          if (task) {
            handleDelete(task)
          }
          break
        case "delete-all":
          handleDeleteAllWorkflow(teacher)
          break
        default:
          break
      }
    },
    [handleViewProgress, handleDelete, handleDeleteAllWorkflow, sendReminderMutation],
  )

  const approvePending = approveMutation.isPending
  const returnPending = returnMutation.isPending

  const columns: ColumnsType<GroupedTeacherApproval> = useMemo(
    () => [
      {
        title: "教师信息",
        dataIndex: "teacher_name",
        key: "teacher_name",
        width: 180,
        fixed: 'left',
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <span className="font-medium text-slate-700">{value}</span>
            <Text type="secondary" className="text-xs">
              {record.department}
            </Text>
            {record.contract_id && (
              <Text type="secondary" className="text-xs">
                合同：{record.contract_id.slice(0, 8)}...
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: "审批进度",
        key: "progress",
        width: 280,
        render: (_value, record) => {
          const completionRate = (record.completedStages / record.totalStages) * 100
          return (
            <Space direction="vertical" size={4} className="w-full">
              <Progress 
                percent={Math.round(completionRate)} 
                size="small"
                status={
                  record.returnedStages > 0 ? 'exception' : 
                  record.completedStages === record.totalStages ? 'success' : 
                  'active'
                }
                strokeColor={
                  record.returnedStages > 0 ? '#ff4d4f' : 
                  record.completedStages === record.totalStages ? '#52c41a' : 
                  '#1890ff'
                }
              />
              <div className="flex gap-2 text-xs">
                <span className="text-slate-600">
                  {record.completedStages}/{record.totalStages} 已完成
                </span>
                {record.pendingStages > 0 && (
                  <Tag color="orange" className="m-0 text-xs">{record.pendingStages} 待处理</Tag>
                )}
                {record.returnedStages > 0 && (
                  <Tag color="red" className="m-0 text-xs">{record.returnedStages} 已退回</Tag>
                )}
              </div>
            </Space>
          )
        },
      },
      {
        title: "优先级",
        dataIndex: "highestPriority",
        key: "priority",
        width: 100,
        render: (value: ApprovalPriority) => (
          <Tag color={priorityLabelMap[value].color}>{priorityLabelMap[value].text}</Tag>
        ),
      },
      {
        title: "总体状态",
        dataIndex: "overallStatus",
        key: "status",
        width: 120,
        render: (value: ApprovalStatus) => {
          const meta = statusLabelMap[value]
          return (
            <Tag icon={meta.icon} color={meta.color} className="px-3 py-1">
              {meta.text}
            </Tag>
          )
        },
      },
      {
        title: "最早截止",
        dataIndex: "earliestDueDate",
        key: "due_date",
        width: 140,
        render: (value: string) => {
          const isOverdue = new Date(value).getTime() < Date.now()
          return (
            <Tag color={isOverdue ? "red" : "cyan"} icon={<ClockCircleOutlined />}>
              {formatDate(value)}
            </Tag>
          )
        },
      },
      {
        title: "当前阶段",
        key: "current_stages",
        width: 220,
        render: (_value, record) => {
          const activeTasks = record.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
          const myTasks = activeTasks.filter(t => canUserOperateTask(t))
          
          return (
            <Space direction="vertical" size={2} className="w-full">
              <Space size={4} wrap>
                {activeTasks.slice(0, 2).map((task) => {
                  const isMyTask = canUserOperateTask(task)
                  return (
                    <Tag 
                      key={task.id} 
                      color={isMyTask ? "blue" : "default"}
                      className={isMyTask ? "font-medium" : ""}
                    >
                      {stageLabelMap[task.stage]}
                      {isMyTask && " ✓"}
                    </Tag>
                  )
                })}
                {activeTasks.length > 2 && (
                  <Tag>+{activeTasks.length - 2}</Tag>
                )}
              </Space>
              {myTasks.length > 0 && selectedStage === 'all' && (
                <Text type="secondary" className="text-xs">
                  {myTasks.length} 个待处理
                </Text>
              )}
            </Space>
          )
        },
      },
      {
        title: "操作",
        key: "actions",
        width: 180,
        fixed: 'right',
        render: (_value, record) => {
          const menuItems: MenuProps["items"] = [
            { key: "view-progress", label: "查看审批进度", icon: <EyeOutlined /> },
            { key: "view-contract", label: "查看合同详情", icon: <ApartmentOutlined /> },
            { key: "remind", label: "发送提醒", icon: <BellOutlined /> },
          ]

          // 只有超级管理员才能看到删除整个流程的选项
          if (isSuperuser) {
            menuItems.push(
              { type: "divider" },
              { 
                key: "delete-all", 
                label: "删除整个审批流程", 
                icon: <DeleteOutlined />,
                danger: true,
              }
            )
          }

          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewProgress(record)}
              >
                查看进度
              </Button>
              <Dropdown
                menu={{
                  items: menuItems,
                  onClick: ({ key }) => handleMoreAction(key, record),
                }}
              >
                <Button size="small" icon={<FilterOutlined />}>
                  更多
                </Button>
              </Dropdown>
            </Space>
          )
        },
      },
    ],
    [handleViewProgress, handleMoreAction, canUserOperateTask, selectedStage, isSuperuser],
  )

  const tasksContent = (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 筛选模式提示 */}
      {selectedStage === 'all' ? (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
          <Space>
            <FilterOutlined className="text-blue-600" />
            <Text className="text-sm text-blue-800">
              <strong>管理视图：</strong>显示所有教师的审批进度。蓝色标记的阶段表示您负责的审批任务。
            </Text>
          </Space>
        </div>
      ) : (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <Space>
            <FilterOutlined className="text-green-600" />
            <Text className="text-sm text-green-800">
              <strong>我的审批：</strong>仅显示您作为负责人或协作人的"{stageLabelMap[selectedStage]}"阶段任务。
            </Text>
          </Space>
        </div>
      )}
      
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Space size={12} wrap>
          <Segmented
            value={activeStatus}
            onChange={(value) => setActiveStatus(value as ApprovalStatus | "all")}
            options={statusOptions}
          />
          <Segmented
            value={selectedStage}
            onChange={(value) => setSelectedStage(value as ApprovalStageKey | "all")}
            options={[
              { label: "全部节点", value: "all" },
              { label: "入职准备", value: "entry" },
              { label: "资格审核", value: "qualification" },
              { label: "试用评估", value: "probation" },
              { label: "合同签署", value: "signature" },
              { label: "复核归档", value: "archive" },
              { label: "续签提醒", value: "renewal" },
            ]}
          />
        </Space>
        <Space size={12} wrap>
          <Tooltip title="自动补齐流程节点提醒">
            <Button icon={<BellOutlined />}>提醒责任人</Button>
          </Tooltip>
          <Tooltip title="导出当前筛选的审批任务">
            <Button icon={<NodeIndexOutlined />}>导出审批列表</Button>
          </Tooltip>
        </Space>
      </div>

      <Table
        rowKey="contract_id"
        columns={columns}
        dataSource={groupedTeacherData}
        loading={tasksQuery.isLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: groupedTeacherData.length,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 位教师`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, current: page, pageSize })
          },
        }}
        scroll={{ x: "max-content" }}
        className="approval-table rounded-2xl border border-white/50"
        locale={{
          emptyText: tasksQuery.isError ? "加载失败，请重试" : "暂无审批任务",
        }}
      />
    </Space>
  )

  const overviewContent = overviewQuery.isLoading ? (
    <div className="flex items-center justify-center py-12">
      <Spin size="large" />
    </div>
  ) : overviewQuery.isError ? (
    <Empty description="统计数据加载失败" />
  ) : (
    <div className="grid gap-4 lg:grid-cols-4">
      {[
        {
          title: "待处理任务",
          value: overviewQuery.data?.pending ?? 0,
          description: "等待审核的合同节点",
          color: "bg-amber-100/80",
          icon: <ClockCircleOutlined className="text-amber-500" />,
        },
        {
          title: "处理中",
          value: overviewQuery.data?.in_progress ?? 0,
          description: "正在跟进的审批任务",
          color: "bg-blue-100/70",
          icon: <ThunderboltOutlined className="text-blue-600" />,
        },
        {
          title: "已完成",
          value: overviewQuery.data?.completed ?? 0,
          description: "审核通过的节点",
          color: "bg-emerald-100/70",
          icon: <CheckCircleOutlined className="text-emerald-600" />,
        },
        {
          title: "已退回",
          value: overviewQuery.data?.returned ?? 0,
          description: "需要重新处理的任务",
          color: "bg-red-100/70",
          icon: <ExclamationCircleOutlined className="text-red-600" />,
        },
      ].map((stat) => (
        <Card key={stat.title} className={`rounded-2xl border border-white/70 ${stat.color} p-5 shadow-sm`}>
          <Space size={16} align="start">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">
              {stat.icon}
            </span>
            <div className="space-y-1">
              <div className="text-sm text-slate-500">{stat.title}</div>
              <div className="text-3xl font-semibold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.description}</div>
            </div>
          </Space>
        </Card>
      ))}
    </div>
  )

  const historyContent = (
    <Card className="rounded-2xl border border-white/60 bg-white/92 p-6 shadow-sm">
      {!selectedTaskId ? (
        <Empty description="请选择审批任务查看历史" />
      ) : historyQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      ) : historyQuery.isError ? (
        <Empty description="历史记录加载失败" />
      ) : historyQuery.data && historyQuery.data.length > 0 ? (
        <Space direction="vertical" size="middle" className="w-full">
          {historyQuery.data.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200/60 bg-white/90 p-4 shadow-sm">
              <Space direction="vertical" size={4}>
                <Space size={12} wrap>
                  <Tag color="blue">{item.action}</Tag>
                  <Text type="secondary" className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </Space>
                <Text className="text-sm text-slate-700">处理人：{item.operator}</Text>
                {item.comment ? (
                  <Text type="secondary" className="text-xs text-slate-500">
                    {item.comment}
                  </Text>
                ) : null}
              </Space>
            </div>
          ))}
        </Space>
      ) : (
        <Empty description="暂无审批历史" />
      )}
    </Card>
  )

  const tabItems = [
    { key: "tasks", label: "任务列表", children: tasksContent },
    { key: "overview", label: "统计概览", children: overviewContent },
    { key: "history", label: "审批历史", children: historyContent },
  ]

  // 审批进度详情 Drawer
  const progressDrawer = (
    <Drawer
      title={
        <Space>
          <span>审批进度详情</span>
          {selectedTeacher && (
            <Tag color="blue">
              {selectedTeacher.teacher_name} - {selectedTeacher.department}
            </Tag>
          )}
        </Space>
      }
      placement="right"
      width={720}
      open={progressDrawerVisible}
      onClose={() => {
        setProgressDrawerVisible(false)
        setSelectedTeacher(null)
      }}
      className="approval-progress-drawer"
    >
      {selectedTeacher && (
        <Space direction="vertical" size="large" className="w-full">
          {/* 总体进度 */}
          <Card className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
            <Space direction="vertical" size={12} className="w-full">
              <div className="flex items-center justify-between">
                <Text className="text-base font-medium">总体进度</Text>
                <Tag 
                  icon={statusLabelMap[selectedTeacher.overallStatus].icon} 
                  color={statusLabelMap[selectedTeacher.overallStatus].color}
                  className="px-3 py-1"
                >
                  {statusLabelMap[selectedTeacher.overallStatus].text}
                </Tag>
              </div>
              <Progress 
                percent={Math.round((selectedTeacher.completedStages / selectedTeacher.totalStages) * 100)} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                status={
                  selectedTeacher.returnedStages > 0 ? 'exception' : 
                  selectedTeacher.completedStages === selectedTeacher.totalStages ? 'success' : 
                  'active'
                }
              />
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-600">{selectedTeacher.completedStages}</div>
                  <div className="text-xs text-slate-500">已完成</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-orange-600">{selectedTeacher.pendingStages}</div>
                  <div className="text-xs text-slate-500">待处理</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-600">{selectedTeacher.returnedStages}</div>
                  <div className="text-xs text-slate-500">已退回</div>
                </div>
              </div>
            </Space>
          </Card>

          {/* 审批阶段步骤 */}
          <Card className="rounded-xl" title="审批阶段">
            <Steps
              direction="vertical"
              current={selectedTeacher.tasks.findIndex(t => t.status === 'in_progress' || t.status === 'pending')}
              items={selectedTeacher.tasks.map((task) => {
                const statusMeta = statusLabelMap[task.status]
                return {
                  title: stageLabelMap[task.stage],
                  description: (
                    <Space direction="vertical" size={8} className="w-full pt-2">
                      <div className="flex items-center gap-2">
                        <Tag icon={statusMeta.icon} color={statusMeta.color}>
                          {statusMeta.text}
                        </Tag>
                        <Tag color={priorityLabelMap[task.priority].color}>
                          优先级：{priorityLabelMap[task.priority].text}
                        </Tag>
                      </div>
                      <div className="text-xs text-slate-600">
                        <div>负责人：{task.owner}</div>
                        {task.assignees.length > 0 && (
                          <div className="mt-1">
                            协作人：
                            <Space size={4} className="ml-2">
                              {task.assignees.map((assignee) => (
                                <Tag key={assignee} color="purple" className="text-xs">
                                  {assignee}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                        <div className="mt-1">截止日期：{formatDate(task.due_date)}</div>
                        {task.remarks && (
                          <div className="mt-1 text-slate-500">备注：{task.remarks}</div>
                        )}
                      </div>
                      {task.check_items.length > 0 && (
                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="mb-2 text-xs font-medium text-slate-700">核查项：</div>
                          <Space direction="vertical" size={4}>
                            {task.check_items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                {item.completed ? (
                                  <CheckCircleOutlined className="text-green-500" />
                                ) : (
                                  <StopOutlined className="text-slate-400" />
                                )}
                                <span className={item.completed ? 'text-slate-700' : 'text-slate-500'}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </Space>
                        </div>
                      )}
                      {/* 根据用户权限显示操作按钮 */}
                      {canUserOperateTask(task) ? (
                        <Space size={8} className="mt-2" wrap>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setProgressDrawerVisible(false)
                              handleApprove(task)
                            }}
                            disabled={task.status !== 'pending' && task.status !== 'in_progress'}
                            loading={actionTaskId === task.id && approvePending}
                          >
                            通过
                          </Button>
                          <Button
                            danger
                            size="small"
                            onClick={() => {
                              setProgressDrawerVisible(false)
                              handleReturn(task)
                            }}
                            disabled={task.status !== 'pending' && task.status !== 'in_progress'}
                            loading={actionTaskId === task.id && returnPending}
                          >
                            退回
                          </Button>
                          <Button
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => {
                              setSelectedTaskId(task.id)
                              setActiveTabKey('history')
                              setProgressDrawerVisible(false)
                            }}
                          >
                            查看历史
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              handleDelete(task)
                            }}
                            loading={actionTaskId === task.id && deleteMutation.isPending}
                          >
                            删除任务
                          </Button>
                        </Space>
                      ) : (
                        <Space size={8} className="mt-2" wrap>
                          <Tag color="default" className="px-3 py-1">
                            您不是该阶段的审批人
                          </Tag>
                          <Button
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => {
                              setSelectedTaskId(task.id)
                              setActiveTabKey('history')
                              setProgressDrawerVisible(false)
                            }}
                          >
                            查看历史
                          </Button>
                        </Space>
                      )}
                    </Space>
                  ),
                  status: 
                    task.status === 'completed' ? 'finish' : 
                    task.status === 'returned' ? 'error' : 
                    task.status === 'in_progress' ? 'process' : 
                    'wait',
                  icon: task.status === 'completed' ? <CheckCircleOutlined /> : 
                        task.status === 'returned' ? <ExclamationCircleOutlined /> :
                        task.status === 'in_progress' ? <LoadingOutlined /> :
                        <ClockCircleOutlined />,
                }
              })}
            />
          </Card>

          {/* 合同信息快捷入口 */}
          {selectedTeacher.contract_id && (
            <Card className="rounded-xl">
              <Space direction="vertical" size={12} className="w-full">
                <Text className="text-base font-medium">相关操作</Text>
                <Space size={8}>
                  <Button
                    type="primary"
                    icon={<ApartmentOutlined />}
                    onClick={() => {
                      window.open(`/contracts?contractId=${selectedTeacher.contract_id}`, "_blank")
                    }}
                  >
                    查看合同详情
                  </Button>
                  <Button
                    icon={<BellOutlined />}
                    loading={sendReminderMutation.isPending}
                    onClick={() => {
                      sendReminderMutation.mutate({
                        contractId: selectedTeacher.contract_id,
                        teacherName: selectedTeacher.teacher_name,
                        department: selectedTeacher.department,
                      })
                    }}
                  >
                    提醒责任人
                  </Button>
                </Space>
              </Space>
            </Card>
          )}
        </Space>
      )}
    </Drawer>
  )

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card className="rounded-3xl border border-white/60 bg-white/92 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
        <Tabs activeKey={activeTabKey} onChange={(key) => setActiveTabKey(key as typeof activeTabKey)} items={tabItems} />
      </Card>
      {progressDrawer}
    </Space>
  )
}

export default ApprovalDashboard
