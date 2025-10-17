/**
 * 个人中心页面
 */
import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Avatar,
  Descriptions,
  Button,
  Upload,
  Form,
  Input,
  Modal,
  List,
  Badge,
  Empty,
  Spin,
  Tag,
  Space,
  Typography,
  Divider,
} from 'antd';
import type { TabsProps } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';
import {
  UserOutlined,
  CameraOutlined,
  LockOutlined,
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  BankOutlined,
} from '@ant-design/icons';
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useChangePassword,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '../hooks/useProfile';
import { formatDate } from '../utils/date';

const { Title, Text, Paragraph } = Typography;

/**
 * 基础信息模块
 */
const BasicInfoTab: React.FC = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 头像上传前的检查
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      return false;
    }
    return false; // 阻止自动上传，手动触发
  };

  // 手动上传头像
  const handleAvatarChange = (info: UploadChangeParam) => {
    const file = info.file.originFileObj;
    if (file) {
      uploadAvatarMutation.mutate(file as File);
    }
  };

  // 打开编辑弹窗
  const handleEdit = () => {
    form.setFieldsValue({
      full_name: profile?.full_name,
      email: profile?.email,
      phone_number: profile?.phone_number,
    });
    setIsEditModalVisible(true);
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateProfileMutation.mutateAsync(values);
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头像和基本信息 */}
      <Card>
        <div className="flex items-start space-x-8">
          {/* 头像 */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar
              size={120}
              src={profile?.avatar_url}
              icon={<UserOutlined />}
              className="shadow-lg"
            />
            <Upload
              beforeUpload={beforeUpload}
              onChange={handleAvatarChange}
              showUploadList={false}
              accept="image/*"
            >
              <Button
                icon={<CameraOutlined />}
                loading={uploadAvatarMutation.isPending}
              >
                更换头像
              </Button>
            </Upload>
          </div>

          {/* 基本信息 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Title level={3} className="mb-1">
                  {profile?.full_name || profile?.username}
                </Title>
                <Space>
                  <Tag color="blue">{profile?.position || '暂无职位'}</Tag>
                  <Tag color={profile?.job_status === '在职' ? 'green' : 'default'}>
                    {profile?.job_status || '未知状态'}
                  </Tag>
                  {profile?.roles.map((role) => (
                    <Tag key={role} color="purple">
                      {role}
                    </Tag>
                  ))}
                </Space>
              </div>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                编辑资料
              </Button>
            </div>

            <Descriptions column={2} bordered>
              <Descriptions.Item label={<><IdcardOutlined /> 员工工号</>}>
                {profile?.teacher_code || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><BankOutlined /> 部门</>}>
                {profile?.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> 电话</>}>
                {profile?.phone_number || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>
                {profile?.email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="账号状态">
                <Badge
                  status={profile?.is_active ? 'success' : 'error'}
                  text={profile?.is_active ? '正常' : '禁用'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {profile?.last_login ? formatDate(profile.last_login) : '从未登录'}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间" span={2}>
                {profile?.created_at ? formatDate(profile.created_at) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑个人资料"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={updateProfileMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="full_name"
            rules={[{ max: 100, message: '姓名不能超过100个字符' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            label="电话号码"
            name="phone_number"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
            ]}
          >
            <Input placeholder="请输入电话号码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/**
 * 安全设置模块
 */
const SecurityTab: React.FC = () => {
  const { data: profile } = useProfile();
  const changePasswordMutation = useChangePassword();
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [form] = Form.useForm();

  // 提交修改密码
  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields();
      await changePasswordMutation.mutateAsync(values);
      setIsChangePasswordVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="账号安全">
        <List>
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => setIsChangePasswordVisible(true)}
              >
                修改
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<LockOutlined className="text-2xl text-blue-500" />}
              title="登录密码"
              description="定期修改密码可以提高账号安全性"
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              avatar={<UserOutlined className="text-2xl text-green-500" />}
              title="登录账号"
              description={profile?.username}
            />
          </List.Item>
        </List>
      </Card>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={isChangePasswordVisible}
        onOk={handleChangePassword}
        onCancel={() => {
          setIsChangePasswordVisible(false);
          form.resetFields();
        }}
        confirmLoading={changePasswordMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="当前密码"
            name="old_password"
            rules={[
              { required: true, message: '请输入当前密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              { min: 6, message: '密码至少6位' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/**
 * 通知消息模块
 */
const NotificationsTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const pageSize = 10;

  const { data, isLoading, refetch } = useNotifications({
    skip: (page - 1) * pageSize,
    limit: pageSize,
    unread_only: unreadOnly,
  });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // 标记单条已读
  const handleMarkAsRead = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate([id], {
        onSuccess: () => {
          void refetch();
        },
      });
    }
  };

  // 标记所有已读
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        void refetch();
      },
    });
  };

  // 删除通知
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      onOk: () => deleteNotificationMutation.mutate(id, {
        onSuccess: () => {
          void refetch();
        },
      }),
    });
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_pending':
        return <BellOutlined className="text-orange-500" />;
      case 'approval_approved':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'approval_rejected':
        return <DeleteOutlined className="text-red-500" />;
      default:
        return <BellOutlined className="text-blue-500" />;
    }
  };

  // 获取通知类型标签
  const getNotificationTag = (type: string) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      approval_pending: { text: '待审批', color: 'orange' },
      approval_approved: { text: '已通过', color: 'green' },
      approval_rejected: { text: '已驳回', color: 'red' },
      contract_expiring: { text: '合同到期', color: 'purple' },
      system: { text: '系统通知', color: 'blue' },
      info: { text: '消息', color: 'default' },
    };
    const config = typeMap[type] || typeMap.info;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Space>
            <Text strong>通知消息</Text>
            {data && (
              <Badge count={data.unread_count} showZero>
                <Text type="secondary">未读</Text>
              </Badge>
            )}
          </Space>
          <Space>
            <Button
              type={unreadOnly ? 'primary' : 'default'}
              size="small"
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              {unreadOnly ? '显示全部' : '仅未读'}
            </Button>
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={!data?.unread_count}
            >
              全部已读
            </Button>
          </Space>
        </div>

        <Divider className="my-3" />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <>
            <List
              dataSource={data.items}
              renderItem={(item) => (
                <List.Item
                  className={`${!item.is_read ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => handleMarkAsRead(item.id, item.is_read)}
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={getNotificationIcon(item.type)}
                    title={
                      <Space>
                        {item.title}
                        {getNotificationTag(item.type)}
                        {!item.is_read && <Badge status="processing" />}
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          className="mb-1 text-gray-600"
                        >
                          {item.content}
                        </Paragraph>
                        <Text type="secondary" className="text-xs">
                          {formatDate(item.created_at)}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            {data.total > pageSize && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= data.total}
                >
                  加载更多
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

/**
 * 个人中心主页面
 */
const Profile: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get('tab') || 'basic';

  const tabItems: TabsProps['items'] = [
    {
      key: 'basic',
      label: (
        <span>
          <UserOutlined />
          基础信息
        </span>
      ),
      children: <BasicInfoTab />,
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          安全设置
        </span>
      ),
      children: <SecurityTab />,
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          通知消息
        </span>
      ),
      children: <NotificationsTab />,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Title level={2} className="mb-6">
          个人中心
        </Title>
        
        <Card>
          <Tabs 
            defaultActiveKey={defaultTab} 
            size="large"
            items={tabItems}
            onChange={(key) => {
              const params = new URLSearchParams();
              params.set('tab', key);
              window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Profile;

