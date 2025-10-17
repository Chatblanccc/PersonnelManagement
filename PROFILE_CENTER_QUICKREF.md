# 个人中心功能快速参考卡片

## 🚀 快速启动

```bash
# 1. 数据库迁移
psql -U postgres -d personnel_management -f backend/add_profile_features.sql

# 2. 创建目录
mkdir -p backend/uploads/avatars uploads/avatars

# 3. 启动服务
cd backend ; python main.py
cd frontend ; npm run dev
```

## 📍 访问路径

| 功能 | URL | 说明 |
|------|-----|------|
| 基础信息 | `/profile` | 默认页面 |
| 安全设置 | `/profile?tab=security` | 密码修改 |
| 通知消息 | `/profile?tab=notifications` | 消息中心 |

## 🔌 核心 API

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/profile/me` | 获取个人信息 |
| PATCH | `/api/profile/me` | 更新个人信息 |
| POST | `/api/profile/avatar` | 上传头像 |
| POST | `/api/profile/change-password` | 修改密码 |
| GET | `/api/profile/notifications` | 获取通知列表 |
| GET | `/api/profile/notifications/unread-count` | 未读数量 |
| POST | `/api/profile/notifications/mark-read` | 标记已读 |
| DELETE | `/api/profile/notifications/{id}` | 删除通知 |

## 💻 前端 Hooks

```typescript
// 获取个人信息
const { data: profile } = useProfile();

// 更新信息
const updateMutation = useUpdateProfile();
updateMutation.mutate({ full_name: '张三' });

// 上传头像
const uploadMutation = useUploadAvatar();
uploadMutation.mutate(file);

// 修改密码
const changePwdMutation = useChangePassword();
changePwdMutation.mutate({
  old_password: 'old',
  new_password: 'new',
  confirm_password: 'new'
});

// 获取通知
const { data: notifications } = useNotifications({
  skip: 0,
  limit: 20,
  unread_only: false
});

// 未读数量
const { data: unreadData } = useUnreadCount();
```

## 🗄️ 数据库结构

### users 表新增字段
```sql
avatar_url VARCHAR(255)      -- 头像URL
teacher_code VARCHAR(20)     -- 员工工号
department VARCHAR(50)       -- 部门
position VARCHAR(50)         -- 岗位
job_status VARCHAR(20)       -- 在职状态
phone_number VARCHAR(20)     -- 电话号码
```

### notifications 表
```sql
id VARCHAR(36) PRIMARY KEY
user_id VARCHAR(36)          -- 用户ID
type VARCHAR(50)             -- 通知类型
title VARCHAR(200)           -- 标题
content TEXT                 -- 内容
is_read BOOLEAN              -- 是否已读
created_at TIMESTAMPTZ       -- 创建时间
```

## 🎨 通知类型

| 类型 | 值 | 说明 |
|------|-----|------|
| 待审批 | `approval_pending` | 橙色 |
| 已通过 | `approval_approved` | 绿色 |
| 已驳回 | `approval_rejected` | 红色 |
| 合同到期 | `contract_expiring` | 紫色 |
| 系统通知 | `system` | 蓝色 |
| 一般消息 | `info` | 默认 |

## 🔒 安全要点

- ✅ 密码 bcrypt 加密
- ✅ JWT 令牌验证
- ✅ 文件类型检查（jpg/png/gif）
- ✅ 文件大小限制（5MB）
- ✅ SQL 注入防护

## 📊 性能配置

| 功能 | 刷新频率 |
|------|----------|
| 通知列表 | 30秒 |
| 未读数量 | 15秒 |
| 个人信息缓存 | 5分钟 |

## 🛠️ 故障排查

### 头像上传失败
```bash
# 检查目录权限
chmod 755 backend/uploads/avatars
ls -la backend/uploads/
```

### 通知不更新
```bash
# 检查后端日志
tail -f backend/logs/app.log

# 检查浏览器控制台
F12 → Console → 查看网络请求
```

### 密码修改失败
```bash
# 检查当前密码是否正确
# 检查新密码长度（至少6位）
# 查看后端错误日志
```

## 📝 快速测试

### 1. 测试个人信息
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/profile/me
```

### 2. 测试通知列表
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/profile/notifications?limit=5
```

### 3. 测试未读数量
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/profile/notifications/unread-count
```

## 📚 相关文档

- 详细指南：`PROFILE_CENTER_GUIDE.md`
- 开发总结：`PROFILE_CENTER_SUMMARY.md`
- API 文档：`http://localhost:8000/docs`

## 🎯 核心文件位置

### 后端
```
backend/app/
├── models/notification.py           # 通知模型
├── routers/profile.py              # 路由
├── services/profile_service.py     # 服务层
└── schemas/profile.py              # Schema
```

### 前端
```
frontend/src/
├── pages/Profile.tsx               # 主页面
├── api/profile.ts                  # API 客户端
└── hooks/useProfile.ts             # 自定义 Hooks
```

---

**💡 提示：** 更多详细信息请查看完整文档！

