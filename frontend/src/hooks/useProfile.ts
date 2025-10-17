/**
 * 个人中心相关 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  changePassword,
  getNotifications,
  getUnreadCount,
  markNotificationsAsRead,
  markAllAsRead,
  deleteNotification,
  type UserProfile,
  type UpdateProfileData,
  type ChangePasswordData,
  type NotificationList,
} from '../api/profile';

/**
 * 获取个人信息
 */
export const useProfile = () => {
  return useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 更新个人信息
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateProfileData) => updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      message.success('个人信息更新成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '更新失败');
    },
  });
};

/**
 * 上传头像
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      message.success(data.message || '头像上传成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '头像上传失败');
    },
  });
};

/**
 * 修改密码
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => changePassword(data),
    onSuccess: (data) => {
      message.success(data.message || '密码修改成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '密码修改失败');
    },
  });
};

/**
 * 获取通知列表
 */
export const useNotifications = (params: {
  skip?: number;
  limit?: number;
  unread_only?: boolean;
}) => {
  return useQuery<NotificationList>({
    queryKey: ['notifications', params],
    queryFn: () => getNotifications(params),
    refetchInterval: 30000, // 每30秒自动刷新
  });
};

/**
 * 获取未读通知数量
 */
export const useUnreadCount = () => {
  return useQuery<{ unread_count: number }>({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 15000, // 每15秒自动刷新
  });
};

/**
 * 标记通知为已读
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationIds: string[]) => markNotificationsAsRead(notificationIds),
    onSuccess: (_data, notificationIds) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (notificationIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['notification-detail', notificationIds[0]] });
      }
    },
  });
};

/**
 * 标记所有通知为已读
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      message.success(data.message || '已标记所有通知为已读');
    },
  });
};

/**
 * 删除通知
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      message.success('通知已删除');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || '删除失败');
    },
  });
};

