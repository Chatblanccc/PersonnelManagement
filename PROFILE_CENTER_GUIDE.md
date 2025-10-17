# 个人中心功能开发指南

## 功能概述

个人中心是教师合同管理系统的重要组成部分，为用户提供了一个集中管理个人信息、账号安全和系统通知的界面。

## 核心功能模块

### 1. 基础信息总览 ✅

**功能特性：**
- 展示用户头像、姓名、工号、部门、岗位、在职状态
- 显示用户角色标签
- 支持头像上传（最大5MB，支持jpg/png/gif格式）
- 支持编辑基本信息（姓名、邮箱、电话）
- 显示账号状态和最后登录时间

**技术实现：**
- 前端组件：`BasicInfoTab` in `Profile.tsx`
- 后端API：`GET /api/profile/me`、`PATCH /api/profile/me`、`POST /api/profile/avatar`
- 数据模型：扩展了 `User` 模型，新增字段：
  - `avatar_url`: 头像URL
  - `teacher_code`: 员工工号
  - `department`: 部门
  - `position`: 岗位
  - `job_status`: 在职状态
  - `phone_number`: 电话号码

### 2. 安全与账号设置 ✅

**功能特性：**
- 修改登录密码（需验证当前密码）
- 显示当前登录账号
- 密码强度要求：至少6位
- 新密码与确认密码一致性验证

**技术实现：**
- 前端组件：`SecurityTab` in `Profile.tsx`
- 后端API：`POST /api/profile/change-password`
- 密码加密：使用 bcrypt 算法

**安全措施：**
- 需要提供当前密码进行身份验证
- 密码哈希存储，不保存明文
- 修改成功后建议重新登录

### 3. 通知与待办 ✅

**功能特性：**
- 实时显示系统通知和待办事项
- 支持未读通知筛选
- 标记单条通知为已读
- 标记所有通知为已读
- 删除通知
- 通知类型分类（审批相关、合同到期、系统通知等）
- 自动轮询刷新（每30秒）

**技术实现：**
- 前端组件：`NotificationsTab` in `Profile.tsx`
- 后端API：
  - `GET /api/profile/notifications` - 获取通知列表
  - `GET /api/profile/notifications/unread-count` - 获取未读数量
  - `POST /api/profile/notifications/mark-read` - 标记已读
  - `POST /api/profile/notifications/mark-all-read` - 全部已读
  - `DELETE /api/profile/notifications/{id}` - 删除通知
- 数据模型：新建 `Notification` 表

**通知类型：**
- `approval_pending`: 待审批
- `approval_approved`: 审批通过
- `approval_rejected`: 审批驳回
- `contract_expiring`: 合同即将到期
- `system`: 系统通知
- `info`: 一般信息

## 数据库变更

### 新增字段（users 表）

```sql
ALTER TABLE users 
  ADD COLUMN avatar_url VARCHAR(255),
  ADD COLUMN teacher_code VARCHAR(20),
  ADD COLUMN department VARCHAR(50),
  ADD COLUMN position VARCHAR(50),
  ADD COLUMN job_status VARCHAR(20),
  ADD COLUMN phone_number VARCHAR(20);
```

### 新增表（notifications）

```sql
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_contract_id VARCHAR(36),
    related_approval_id VARCHAR(36),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 部署步骤

### 1. 后端部署

1. **运行数据库迁移脚本：**
   ```bash
   cd backend
   psql -U your_user -d your_database -f add_profile_features.sql
   ```

2. **创建头像上传目录：**
   ```bash
   mkdir -p uploads/avatars
   chmod 755 uploads/avatars
   ```

3. **确认依赖已安装：**
   所有依赖已包含在 `requirements.txt` 中，无需额外安装。

4. **重启后端服务：**
   ```bash
   python main.py
   # 或
   uvicorn main:app --reload
   ```

### 2. 前端部署

1. **确认依赖已安装：**
   ```bash
   cd frontend
   npm install
   ```

2. **启动开发服务器：**
   ```bash
   npm run dev
   ```

3. **生产环境构建：**
   ```bash
   npm run build
   ```

## API 文档

### 基础信息 API

#### 获取个人信息
```http
GET /api/profile/me
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "id": "user-id",
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "full_name": "张三",
  "avatar_url": "/uploads/avatars/avatar_xxx.jpg",
  "teacher_code": "T001",
  "department": "教务处",
  "position": "教师",
  "job_status": "在职",
  "phone_number": "13800138000",
  "status": "active",
  "is_active": true,
  "roles": ["teacher", "审批专员"]
}
```

#### 更新个人信息
```http
PATCH /api/profile/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "张三",
  "email": "newemail@example.com",
  "phone_number": "13900139000"
}
```

#### 上传头像
```http
POST /api/profile/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary]
```

### 安全设置 API

#### 修改密码
```http
POST /api/profile/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "old_password": "oldpass123",
  "new_password": "newpass123",
  "confirm_password": "newpass123"
}
```

### 通知消息 API

#### 获取通知列表
```http
GET /api/profile/notifications?skip=0&limit=20&unread_only=false
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "total": 50,
  "unread_count": 5,
  "items": [
    {
      "id": "notif-id",
      "type": "approval_pending",
      "title": "待审批提醒",
      "content": "您有一条新的合同待审批",
      "link_url": "/approvals?id=xxx",
      "is_read": false,
      "created_at": "2025-10-16T10:00:00Z"
    }
  ]
}
```

#### 标记通知为已读
```http
POST /api/profile/notifications/mark-read
Authorization: Bearer {token}
Content-Type: application/json

{
  "notification_ids": ["notif-id-1", "notif-id-2"]
}
```

## 前端使用指南

### 访问个人中心

1. **从导航栏访问：**
   - 点击顶部导航栏的"个人中心"按钮
   - 或点击用户下拉菜单中的"个人中心"

2. **通过通知图标：**
   - 点击通知铃铛图标（显示未读数量徽章）
   - 自动跳转到通知消息页签

3. **直接访问URL：**
   - `/profile` - 默认显示基础信息
   - `/profile?tab=security` - 安全设置
   - `/profile?tab=notifications` - 通知消息

### 自定义 Hooks

系统提供了便捷的 React Hooks 用于个人中心功能：

```typescript
import {
  useProfile,          // 获取个人信息
  useUpdateProfile,    // 更新个人信息
  useUploadAvatar,     // 上传头像
  useChangePassword,   // 修改密码
  useNotifications,    // 获取通知列表
  useUnreadCount,      // 获取未读数量
  useMarkAsRead,       // 标记已读
  useDeleteNotification, // 删除通知
} from '@/hooks/useProfile';
```

## UI/UX 设计要点

### 1. 响应式布局
- 使用 Tailwind CSS 实现响应式设计
- 移动端自动适配

### 2. 实时更新
- 通知列表每30秒自动刷新
- 未读数量每15秒自动刷新
- 使用 React Query 自动缓存和同步

### 3. 交互反馈
- 所有操作都有 loading 状态
- 成功/失败消息提示
- 表单验证实时反馈

### 4. 视觉设计
- 未读通知带有蓝色背景高亮
- 通知类型使用不同颜色标签
- 头像支持默认图标占位

## 扩展建议

### 未来可添加的功能

1. **会话管理：**
   - 显示所有登录设备
   - 远程登出功能
   - 登录历史记录

2. **个性化设置：**
   - 主题切换（亮色/暗色）
   - 语言偏好设置
   - 通知推送设置

3. **数据统计：**
   - 个人工作量统计
   - 审批效率分析
   - 登录活跃度图表

4. **社交功能：**
   - 内部即时通讯
   - 工作流协作
   - 同事通讯录

5. **高级安全：**
   - 双因素认证（2FA）
   - 密码强度检测
   - 安全日志审计

## 故障排查

### 常见问题

1. **头像上传失败**
   - 检查文件大小是否超过5MB
   - 确认文件格式是否支持
   - 检查 `uploads/avatars` 目录权限

2. **通知不更新**
   - 检查浏览器网络连接
   - 确认后端服务正常运行
   - 查看浏览器控制台错误信息

3. **密码修改失败**
   - 确认当前密码输入正确
   - 检查新密码是否符合要求
   - 查看后端日志错误信息

## 性能优化

1. **图片优化：**
   - 头像自动压缩至合适尺寸
   - 使用 CDN 加速图片加载

2. **数据缓存：**
   - React Query 自动缓存个人信息
   - 减少不必要的 API 请求

3. **懒加载：**
   - 通知列表分页加载
   - 图片懒加载

## 维护说明

### 定期维护任务

1. **清理过期通知：**
   ```sql
   DELETE FROM notifications 
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

2. **监控存储空间：**
   定期检查 `uploads/avatars` 目录大小

3. **数据库索引优化：**
   定期分析和优化通知表索引

## 总结

个人中心功能已完整实现，包含：
- ✅ 基础信息展示与编辑
- ✅ 头像上传
- ✅ 密码修改
- ✅ 通知消息管理
- ✅ 实时未读提醒
- ✅ 响应式设计
- ✅ 完整的 API 文档

所有功能均已测试，可直接投入使用。

