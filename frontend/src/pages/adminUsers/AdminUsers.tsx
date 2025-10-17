import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Empty,
  Select,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import {
  fetchUsers,
  fetchRoles,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
} from '@/api/auth'
import type {
  AuthUser,
  Role,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types/auth'
import { useAuthStore } from '@/store/authStore'
import { getRoleDisplayLabel } from '@/utils/role'

const { Title, Text } = Typography

type ViewMode = 'users' | 'roles'

const DEFAULT_PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { label: '在职', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '冻结', value: 'suspended' },
  { label: '离职', value: 'terminated' },
]

const AdminUsers: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('users')
  const [users, setUsers] = useState<AuthUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [form] = Form.useForm<CreateUserPayload & UpdateUserPayload>()
  const watchedRoles = Form.useWatch('roles', form) ?? []

  const hasManagePermission = useAuthStore((state) => state.hasPermission('settings.manage'))
  const accessToken = useAuthStore((state) => state.accessToken)

  const loadUsers = async (pageIndex = 1) => {
    if (!hasManagePermission || !accessToken) {
      setUsers([])
      setTotal(0)
      return
    }
    try {
      setLoading(true)
      const response = await fetchUsers({ page: pageIndex, page_size: DEFAULT_PAGE_SIZE })
      setUsers(response.data)
      setTotal(response.total)
      setPage(pageIndex)
    } catch (error) {
      message.error('加载用户列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    if (!hasManagePermission || !accessToken) {
      setRoles([])
      return
    }
    try {
      const response = await fetchRoles()
      setRoles(response.data)
    } catch (error) {
      message.error('加载角色列表失败')
      console.error(error)
    }
  }

  useEffect(() => {
    if (!hasManagePermission || !accessToken) return
    void loadUsers()
    void loadRoles()
  }, [hasManagePermission, accessToken])

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ roles: [] })
    setModalVisible(true)
  }

  const handleEdit = (record: AuthUser) => {
    setEditingUser(record)
    form.setFieldsValue({
      username: record.username,
      email: record.email ?? undefined,
      full_name: record.full_name ?? undefined,
      status: record.status ?? undefined,
      is_active: record.is_active,
      is_superuser: record.is_superuser,
      roles: record.roles.map((role) => role.name),
    })
    setModalVisible(true)
  }

  const handleDelete = async (record: AuthUser) => {
    try {
      await deleteUserApi(record.id)
      message.success('删除成功')
      void loadUsers(page)
    } catch (error) {
      message.error('删除失败')
      console.error(error)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        const payload: UpdateUserPayload = {
          email: values.email ?? undefined,
          full_name: values.full_name ?? undefined,
          status: values.status ?? undefined,
          is_active: values.is_active,
          is_superuser: values.is_superuser,
          roles: values.roles,
          password: values.password || undefined,
        }

        await updateUserApi(editingUser.id, payload)
        message.success('用户信息已更新')
      } else {
        const payload: CreateUserPayload = {
          username: values.username,
          password: values.password,
          email: values.email ?? undefined,
          full_name: values.full_name ?? undefined,
          status: values.status ?? 'active',
          is_active: values.is_active ?? true,
          is_superuser: values.is_superuser ?? false,
          roles: values.roles ?? [],
        }

        await createUserApi(payload)
        message.success('用户创建成功')
      }

      setModalVisible(false)
      form.resetFields()
      void loadUsers(editingUser ? page : 1)
    } catch (error) {
      if (!(error as any)?.errorFields) {
        message.error(editingUser ? '更新失败' : '创建用户失败')
        console.error(error)
      }
    }
  }

  const columns: ColumnsType<AuthUser> = useMemo(
    () => [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: '姓名',
        dataIndex: 'full_name',
        key: 'full_name',
        render: (value: string | null) => value ?? '—',
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        render: (value: string | null) => value ?? '—',
      },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        render: (value: Role[]) => (
          <Space size={[6, 6]} wrap>
            {value.map((role) => (
              <Tag key={role.id} color={role.is_system ? 'geekblue' : 'blue'}>
                {getRoleDisplayLabel(role) || role.name}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        key: 'status',
        render: (_value, record) => (
          <Space size={6}>
            <Tag color={record.is_active ? 'green' : 'red'}>{record.is_active ? '启用' : '停用'}</Tag>
            {record.is_superuser ? <Tag color="gold">超级管理员</Tag> : null}
          </Space>
        ),
      },
      {
        title: '最近登录',
        dataIndex: 'last_login',
        key: 'last_login',
        render: (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        render: (_, record) => (
          <Space>
            <Button type="link" onClick={() => handleEdit(record)} disabled={!hasManagePermission}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除该用户？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
              disabled={!hasManagePermission || record.username === 'admin'}
            >
              <Button type="link" danger disabled={!hasManagePermission || record.username === 'admin'}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [hasManagePermission, handleDelete]
  )

  const roleCards = useMemo(
    () => (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Card
            key={role.id}
            className="h-full rounded-2xl border border-white/60 bg-white/92 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
            title={
              <Flex align="center" justify="space-between">
                <span className="text-base font-semibold text-slate-800">
                  {getRoleDisplayLabel(role) || role.name}
                </span>
                <Tag color={role.is_system ? 'red' : role.is_default ? 'blue' : 'green'}>
                  {role.is_system ? '系统角色' : role.is_default ? '默认角色' : '自定义'}
                </Tag>
              </Flex>
            }
          >
            <Space direction="vertical" size={8} className="w-full">
              <Text type="secondary">{role.description || '暂无描述'}</Text>
              <Divider className="!my-3" />
              <div className="flex flex-wrap gap-2">
                {role.permissions.length ? (
                  role.permissions.map((perm) => (
                    <Tag key={perm.code} color="blue">
                      {perm.description ?? perm.code}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">暂无权限配置</Text>
                )}
              </div>
            </Space>
          </Card>
        ))}
      </div>
    ),
    [roles]
  )

  const modalTitle = editingUser ? `编辑用户 · ${editingUser.username}` : '新增用户'

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card className="rounded-2xl border border-white/60 bg-white/90 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
        <Flex align="center" justify="space-between" gap={16} wrap>
          <Space direction="vertical" size={4}>
            <Title level={4} className="!mb-0 !text-slate-800">
              账号与权限
            </Title>
            <Text type="secondary">管理系统用户、角色与权限，控制可访问的合同数据与操作。</Text>
          </Space>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { label: '用户列表', value: 'users' },
              { label: '角色权限', value: 'roles' },
            ]}
          />
        </Flex>
        <Divider className="!my-4" />

        {viewMode === 'users' ? (
          <Space direction="vertical" size="large" className="w-full">
            <Flex align="center" justify="space-between" wrap gap={12}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadUsers(page)}
                  loading={loading}
                  disabled={!hasManagePermission}
                >
                  刷新
                </Button>
              </Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                disabled={!hasManagePermission}
              >
                新增用户
              </Button>
            </Flex>

            <Table<AuthUser>
              rowKey="id"
              columns={columns}
              dataSource={users}
              loading={loading}
              locale={{ emptyText: loading ? '数据加载中…' : <Empty description="暂无用户" /> }}
              pagination={{
                current: page,
                pageSize: DEFAULT_PAGE_SIZE,
                total,
                showTotal: (totalCount) => `共 ${totalCount} 个用户`,
                onChange: (next) => loadUsers(next),
              }}
            />
          </Space>
        ) : (
          roles.length ? roleCards : <Empty description="暂无角色信息" className="py-12" />
        )}
      </Card>

      <Form<CreateUserPayload & UpdateUserPayload>
        form={form}
        layout="vertical"
        initialValues={{
          is_active: true,
          is_superuser: false,
          roles: [],
        }}
      >
        <Modal
          title={modalTitle}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false)
            form.resetFields()
          }}
          width={720}
          okButtonProps={{ disabled: !hasManagePermission }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入登录用户名" disabled={Boolean(editingUser)} />
            </Form.Item>
            <Form.Item name="full_name" label="姓名">
              <Input placeholder="请输入真实姓名" />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
            >
              <Input placeholder="name@example.com" />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                placeholder="请选择账号状态"
                options={STATUS_OPTIONS}
                allowClear
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={editingUser ? '重置密码' : '初始密码'}
              rules={editingUser ? [] : [{ required: true, message: '请输入初始密码' }]}
            >
              <Input.Password placeholder={editingUser ? '如需重置请输入新密码' : '至少 8 位，包含大小写和数字'} />
            </Form.Item>
            <Form.Item label="角色" name="roles">
              <Space size={[6, 6]} wrap>
                {roles.map((role) => (
                  <Tag.CheckableTag
                    key={role.id}
                    checked={watchedRoles.includes(role.name)}
                    onChange={(checked) => {
                      const current = watchedRoles
                      const next = checked
                        ? [...current, role.name]
                        : current.filter((item) => item !== role.name)
                      form.setFieldsValue({ roles: next })
                    }}
                  >
                    {getRoleDisplayLabel(role) || role.name}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </Form.Item>
            <Form.Item name="is_active" label="启用状态" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_superuser" label="超级管理员" valuePropName="checked">
              <Switch disabled={Boolean(editingUser && editingUser.username === 'admin')} />
            </Form.Item>
          </div>
        </Modal>
      </Form>
    </Space>
  )
}

export default AdminUsers
