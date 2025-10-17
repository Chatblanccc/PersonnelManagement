# 调试"发送提醒"功能问题

## 问题描述

用户点击"发送提醒"后：
1. 返回的接口内容是 `{"unread_count":0}`
2. 弹出提示："已向责任人发送提醒（模拟）"

## 可能的原因

### 1. 前端代码未正确刷新

**检查步骤：**

1. 停止前端开发服务器（Ctrl+C）
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 重新启动前端：
   ```bash
   cd frontend
   npm run dev
   ```
4. 硬刷新浏览器页面（Ctrl+F5 或 Ctrl+Shift+R）

### 2. API 路径错误

**检查步骤：**

1. 打开浏览器开发者工具（F12）
2. 切换到 Network（网络）选项卡
3. 点击"发送提醒"按钮
4. 查看实际发送的请求：
   - **正确的请求**: `POST http://localhost:8000/api/approvals/tasks/send-reminder?teacher_name=xxx&department=xxx`
   - **错误的请求**: 如果是其他路径，说明有问题

**期望的请求信息：**
```
Method: POST
URL: http://localhost:8000/api/approvals/tasks/send-reminder
Query Params:
  - teacher_name: 张三
  - department: 数学组
  或
  - contract_id: abc123
Headers:
  - Authorization: Bearer <token>
```

**期望的响应：**
```json
{
  "success": true,
  "message": "已成功发送 2 条提醒通知",
  "notification_count": 2
}
```

### 3. 后端接口未正确加载

**检查步骤：**

1. 访问 API 文档：http://localhost:8000/docs
2. 查找 `/approvals/tasks/send-reminder` 端点
3. 如果找不到，说明后端未正确加载，需要重启后端：
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

### 4. 前端文件未保存

**检查步骤：**

1. 在 VS Code / Cursor 中，检查 `frontend/src/pages/Approvals.tsx` 文件
2. 确认文件没有未保存标记（通常是文件名旁边的圆点）
3. 如果有未保存的更改，保存文件（Ctrl+S）

## 调试步骤

### Step 1: 检查浏览器控制台

打开浏览器控制台（F12），执行以下操作：

1. 切换到 Console 选项卡
2. 点击"发送提醒"按钮
3. 查看是否有错误信息

### Step 2: 检查网络请求

1. 切换到 Network 选项卡
2. 点击"发送提醒"按钮
3. 找到 `send-reminder` 请求
4. 查看：
   - Request URL（请求地址）
   - Request Method（请求方法）
   - Status Code（状态码）
   - Response（响应内容）

### Step 3: 手动测试后端 API

使用以下命令测试后端 API（需要先获取 token）：

```bash
# 获取 token（请替换用户名和密码）
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 使用返回的 token 测试发送提醒（请替换 <token> 和参数）
curl -X POST "http://localhost:8000/api/approvals/tasks/send-reminder?teacher_name=张三&department=数学组" \
  -H "Authorization: Bearer <token>"
```

### Step 4: 检查前端代码

确认 `frontend/src/pages/Approvals.tsx` 文件中的代码是：

```typescript
// 第505-511行左右
case "remind":
  sendReminderMutation.mutate({
    contractId: teacher.contract_id,
    teacherName: teacher.teacher_name,
    department: teacher.department,
  })
  break
```

**而不是：**
```typescript
case "remind":
  notifySuccess("已向责任人发送提醒（模拟）")
  break
```

### Step 5: 检查 API 定义

确认 `frontend/src/api/contracts.ts` 文件中有：

```typescript
export const sendApprovalReminder = async (params: {
  contractId?: string
  teacherName?: string
  department?: string
}): Promise<SendReminderResponse> => {
  return apiClient.post('/approvals/tasks/send-reminder', null, {
    params: {
      contract_id: params.contractId,
      teacher_name: params.teacherName,
      department: params.department,
    }
  })
}
```

## 常见错误及解决方案

### 错误1: 404 Not Found

**原因**: 后端路由未注册或路径错误

**解决方案**:
1. 检查 `backend/app/routers/approvals.py` 中是否有 `@router.post("/tasks/send-reminder")` 端点
2. 检查 `backend/main.py` 中是否注册了 `approvals_router`
3. 重启后端服务

### 错误2: 403 Forbidden

**原因**: 用户没有审批权限

**解决方案**:
1. 确保登录用户有 `contracts.audit` 权限
2. 或者使用管理员账号登录

### 错误3: 400 Bad Request - "必须提供 contract_id 或 teacher_name+department"

**原因**: 参数传递不完整

**解决方案**:
1. 检查前端传递的参数是否完整
2. 至少要提供 `contract_id` 或 `teacher_name + department`

### 错误4: 404 - "未找到待处理的审批任务"

**原因**: 
- 该教师没有待处理的审批任务
- 或者审批任务都已完成

**解决方案**:
1. 选择一个有待处理任务的教师
2. 或者创建新的审批任务

## 完整的测试流程

1. **准备环境**
   ```bash
   # 后端
   cd backend
   python -m uvicorn app.main:app --reload
   
   # 前端（新终端）
   cd frontend
   npm run dev
   ```

2. **登录系统**
   - 访问 http://localhost:5173
   - 使用管理员账号登录

3. **进入审批工作台**
   - 点击左侧菜单"审批工作台"
   - 找到一个状态为"待处理"或"处理中"的教师

4. **发送提醒**
   - 点击该行的"更多"按钮
   - 选择"发送提醒"
   - 观察提示消息

5. **验证通知**
   - 查看导航栏通知图标是否有未读数量
   - 点击用户头像 → 个人中心
   - 切换到"通知消息"选项卡
   - 查看是否有新的提醒通知

## 快速诊断命令

在浏览器控制台执行以下代码快速测试：

```javascript
// 测试 API 调用
fetch('http://localhost:8000/api/approvals/tasks', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(d => console.log('审批任务列表:', d))

// 测试发送提醒
const task = // 从上面获取的第一个任务
fetch(`http://localhost:8000/api/approvals/tasks/send-reminder?teacher_name=${task.teacher_name}&department=${task.department}`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(d => console.log('发送提醒结果:', d))
```

## 联系开发者

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器控制台的完整错误信息（截图）
2. Network 选项卡中 send-reminder 请求的详细信息（截图）
3. 后端控制台的日志输出
4. 前端代码中 handleMoreAction 函数的完整代码

---

*调试文档创建日期：2025-01-16*

