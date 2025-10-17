/**
 * 个人中心 API
 */
import apiClient from './client';

// ============ 类型定义 ============

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  teacher_code?: string;
  department?: string;
  position?: string;
  job_status?: string;
  phone_number?: string;
  status: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
  roles: string[];
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
  email?: string;
  phone_number?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content?: string;
  link_url?: string;
  is_read: boolean;
  read_at?: string;
  related_contract_id?: string;
  related_approval_id?: string;
  created_at: string;
}

export interface NotificationList {
  total: number;
  unread_count: number;
  items: Notification[];
}

// ============ API 函数 ============

/**
 * 获取当前用户信息
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  return await apiClient.get('/profile/me');
};

/**
 * 更新个人信息
 */
export const updateMyProfile = async (data: UpdateProfileData): Promise<UserProfile> => {
  return await apiClient.patch('/profile/me', data);
};

/**
 * 上传头像
 */
export const uploadAvatar = async (file: File): Promise<{ success: boolean; avatar_url: string; message: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  return await apiClient.post('/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * 修改密码
 */
export const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
  return await apiClient.post('/profile/change-password', data);
};

/**
 * 获取通知列表
 */
export const getNotifications = async (params: {
  skip?: number;
  limit?: number;
  unread_only?: boolean;
}): Promise<NotificationList> => {
  return await apiClient.get('/profile/notifications', { params });
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = async (): Promise<{ unread_count: number }> => {
  return await apiClient.get('/profile/notifications/unread-count');
};

/**
 * 标记通知为已读
 */
export const markNotificationsAsRead = async (notificationIds: string[]): Promise<{ success: boolean; message: string }> => {
  return await apiClient.post('/profile/notifications/mark-read', {
    notification_ids: notificationIds,
  });
};

/**
 * 标记所有通知为已读
 */
export const markAllAsRead = async (): Promise<{ success: boolean; message: string }> => {
  return await apiClient.post('/profile/notifications/mark-all-read');
};

/**
 * 删除通知
 */
export const deleteNotification = async (notificationId: string): Promise<{ success: boolean; message: string }> => {
  return await apiClient.delete(`/profile/notifications/${notificationId}`);
};

