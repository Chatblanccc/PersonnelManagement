# 审批提醒功能实现说明

## 功能概述

在审批工作台中，当用户点击"更多"-"发送提醒"后，系统会自动向相关审批任务的负责人和协作人发送友好的提醒通知。这些通知会显示在个人中心-消息通知部分。

---

## 功能特点

### 1. 智能提醒目标识别
- 自动识别审批任务的负责人（owner）
- 自动识别所有协作人（assignees）
- 支持通过合同ID或教师信息发送提醒
- 只针对"待处理"和"处理中"的任务发送提醒

### 2. 个性化通知内容
- **单个任务提醒**：显示教师姓名、审批阶段、截止日期
- **多个任务提醒**：汇总显示该教师有多少个待处理阶段
- 包含发送人姓名，便于追溯
- 提供直接跳转链接到审批页面

### 3. 前端交互优化
- 两个位置可以发送提醒：
  1. 表格行的"更多"菜单
  2. 审批进度详情抽屉中的"提醒责任人"按钮
- 按钮加载状态显示
- 友好的成功/失败提示
- 显示发送通知的数量

---

## 实现细节

### 后端实现

#### 1. 服务层 (`backend/app/services/approval_service.py`)

新增 `send_approval_reminder` 方法：

```python
@staticmethod
def send_approval_reminder(
    db: Session,
    *,
    contract_id: Optional[str] = None,
    teacher_name: Optional[str] = None,
    department: Optional[str] = None,
    sender_name: str,
) -> int:
    """
    发送审批提醒通知给相关负责人
    
    返回：发送的通知数量
    """
```

**功能逻辑：**
1. 根据合同ID或教师信息查找相关审批任务
2. 过滤出"待处理"和"处理中"的任务
3. 收集所有任务的负责人和协作人
4. 根据用户标识（full_name或username）查找用户ID
5. 为每个用户创建通知记录
6. 构建个性化的通知内容

#### 2. 路由层 (`backend/app/routers/approvals.py`)

新增 API 端点：

```python
@router.post("/tasks/send-reminder")
async def send_approval_reminder(
    contract_id: Optional[str] = Query(None),
    teacher_name: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    ...
)
```

**参数要求：**
- 必须提供 `contract_id` 或 `teacher_name + department`
- 需要审批权限 (`contracts.audit`)

**返回示例：**
```json
{
  "success": true,
  "message": "已成功发送 2 条提醒通知",
  "notification_count": 2
}
```

---

### 前端实现

#### 1. API 调用 (`frontend/src/api/contracts.ts`)

新增接口：

```typescript
export const sendApprovalReminder = async (params: {
  contractId?: string
  teacherName?: string
  department?: string
}): Promise<SendReminderResponse>
```

#### 2. 审批工作台 (`frontend/src/pages/Approvals.tsx`)

**新增 Mutation：**

```typescript
const sendReminderMutation = useMutation({
  mutationFn: async ({ contractId, teacherName, department }) => {
    return await sendApprovalReminder({
      contractId,
      teacherName,
      department,
    })
  },
  onSuccess: (data) => {
    notifySuccess(data.message)
  },
  onError: (error) => {
    notifyWarning(error.message || "发送提醒失败")
  },
})
```

**集成位置：**
1. 表格"更多"菜单的"发送提醒"选项
2. 审批进度抽屉中的"提醒责任人"按钮

---

## 测试步骤

### 准备工作

1. **启动后端服务**：
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **启动前端服务**：
   ```bash
   cd frontend
   npm run dev
   ```

3. **准备测试数据**：
   - 确保数据库中有审批任务
   - 确保审批任务有负责人和协作人
   - 至少有一个任务状态为"待处理"或"处理中"

### 测试场景

#### 场景1：从表格发送提醒

1. 登录系统，进入"审批工作台"
2. 找到一个有待处理任务的教师
3. 点击该行的"更多"按钮
4. 选择"发送提醒"选项
5. **预期结果**：
   - 页面显示成功提示："已成功发送 X 条提醒通知"
   - 按钮显示加载状态（短暂）

#### 场景2：从审批进度详情发送提醒

1. 在审批工作台，点击某教师的"查看进度"按钮
2. 打开审批进度详情抽屉
3. 滚动到底部"相关操作"区域
4. 点击"提醒责任人"按钮
5. **预期结果**：
   - 页面显示成功提示
   - 按钮显示加载状态

#### 场景3：验证通知接收

1. 切换到被提醒用户的账号（负责人或协作人）
2. 查看导航栏的通知图标
3. **预期结果**：
   - 通知图标显示未读数量增加
   - 点击通知图标或进入个人中心-消息通知
   - 看到新的提醒通知，包含：
     - 标题：审批提醒：XXX - XXX阶段
     - 内容：发送人姓名 + 教师信息 + 阶段名称 + 截止日期
     - 类型标签：待审批（橙色）
     - 未读状态（高亮显示）

#### 场景4：通知交互

1. 在个人中心-消息通知页面
2. 点击通知项
3. **预期结果**：
   - 通知标记为已读
   - 如果有链接，点击可跳转到审批页面

#### 场景5：边界测试

**测试没有待处理任务的情况：**
1. 找一个所有任务都已完成的教师
2. 尝试发送提醒
3. **预期结果**：显示错误提示"未找到待处理的审批任务"

**测试用户不存在的情况：**
1. 后端会自动跳过找不到的用户
2. 只向存在的用户发送通知
3. 返回实际发送的通知数量

---

## 通知内容示例

### 单个任务提醒

**标题：**
```
审批提醒：张三 - 资格审核
```

**内容：**
```
李四 提醒您：张三（数学组）的"资格审核"阶段待处理，截止日期：2025-01-20。
```

### 多个任务提醒

**标题：**
```
审批提醒：张三 有 3 个审批阶段待处理
```

**内容：**
```
李四 提醒您：张三（数学组）有 3 个审批阶段需要您处理，请及时跟进。
```

---

## API 文档

### 发送审批提醒

**端点：** `POST /approvals/tasks/send-reminder`

**权限：** `contracts.audit`

**请求参数（Query）：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| contract_id | string | 否 | 合同ID |
| teacher_name | string | 否 | 教师姓名 |
| department | string | 否 | 部门 |

**注意：** 必须提供 `contract_id` 或 `teacher_name + department`

**成功响应（200）：**
```json
{
  "success": true,
  "message": "已成功发送 2 条提醒通知",
  "notification_count": 2
}
```

**错误响应（400）：**
```json
{
  "detail": "必须提供 contract_id 或 teacher_name+department"
}
```

**错误响应（404）：**
```json
{
  "detail": "未找到待处理的审批任务或没有可提醒的用户"
}
```

---

## 数据库变更

### 通知表 (`notifications`)

使用现有的通知表，新增记录包含：
- `user_id`: 接收通知的用户ID
- `type`: `"approval_pending"`
- `title`: 提醒标题
- `content`: 提醒内容
- `link_url`: 跳转链接（如 `/approvals?taskId=xxx`）
- `related_approval_id`: 关联的审批任务ID
- `related_contract_id`: 关联的合同ID（可选）
- `is_read`: `false`（默认未读）
- `created_at`: 创建时间

---

## 注意事项

1. **权限控制**：只有拥有审批权限的用户才能发送提醒
2. **用户匹配**：通过 `full_name` 或 `username` 匹配用户
3. **任务筛选**：只提醒待处理和处理中的任务
4. **去重处理**：同一用户只会收到一条通知（即使是多个任务的负责人）
5. **友好提示**：前端显示发送的通知数量，便于用户确认

---

## 后续优化建议

1. **批量提醒**：支持选择多个教师批量发送提醒
2. **定时提醒**：接近截止日期自动发送提醒
3. **提醒频率控制**：限制同一任务的提醒频率（如24小时内不重复提醒）
4. **邮件/短信通知**：除了系统内通知，支持邮件或短信提醒
5. **提醒模板**：支持自定义提醒内容模板
6. **提醒统计**：记录提醒发送历史和效果分析

---

## 相关文件清单

### 后端文件
- `backend/app/services/approval_service.py` - 新增提醒服务方法
- `backend/app/routers/approvals.py` - 新增提醒API端点

### 前端文件
- `frontend/src/api/contracts.ts` - 新增提醒API调用
- `frontend/src/pages/Approvals.tsx` - 集成提醒功能

### 数据库
- 使用现有的 `notifications` 表

---

## 完成状态

- ✅ 后端服务层实现
- ✅ 后端路由实现
- ✅ 前端API封装
- ✅ 前端UI集成
- ✅ 无linter错误
- 🔄 等待测试验证

---

*文档创建日期：2025-01-16*
*功能版本：v1.0*

