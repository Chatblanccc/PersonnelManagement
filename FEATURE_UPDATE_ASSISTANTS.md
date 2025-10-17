# 功能更新：超级管理员权限与流程协助人

## 更新日期
2025-10-16

## 功能概述

本次更新实现了两个主要功能：

### 1. 超级管理员全局审批权限
超级管理员（`is_superuser=True`）现在可以审批所有的审批任务，即使任务不属于他们负责或被指派的范围。

### 2. 流程配置协助人功能
在系统设置的流程配置中，每个审批阶段现在可以配置多个协助人。协助人可以代替负责人进行审批操作。

## 修改的文件

### 后端 (Backend)

#### 1. 数据库模型
- **文件**: `backend/app/models/workflow.py`
- **修改**: 为 `WorkflowStage` 模型添加 `assistants` 字段（JSON类型，存储用户ID列表）

#### 2. Schema 定义
- **文件**: `backend/app/schemas/workflow.py`
- **修改**: 
  - `WorkflowStageBase` 添加 `assistants` 字段
  - `WorkflowStageUpdate` 添加 `assistants` 字段支持

#### 3. 审批服务
- **文件**: `backend/app/services/approval_service.py`
- **修改**: `can_user_operate_task` 方法增加 `is_superuser` 参数
  - 超级管理员可以操作所有任务
  - 任务负责人可以操作
  - 被指派人员（包括协助人）可以操作

#### 4. 审批路由
- **文件**: `backend/app/routers/approvals.py`
- **修改**: 所有权限检查调用都传递 `current_user.is_superuser` 参数

#### 5. 工作流服务
- **文件**: `backend/app/services/workflow_service.py`
- **修改**:
  - `get_workflow_config` 返回时包含 `assistants` 字段
  - `update_workflow_stages` 支持更新 `assistants` 字段

#### 6. 审批工作流服务
- **文件**: `backend/app/services/approval_workflow_service.py`
- **修改**: `create_workflow_for_contract` 方法
  - 创建审批任务时，将负责人和所有协助人添加到 `assignees` 列表
  - 协助人可以接收到任务并进行审批操作

#### 7. 合同服务
- **文件**: `backend/app/services/contract_service.py`
- **修改**: `get_dashboard_breakdown` 方法
  - 修正了"待复核"统计逻辑
  - 现在基于审批任务状态而非 OCR 置信度

### 前端 (Frontend)

#### 1. 类型定义
- **文件**: `frontend/src/types/settings.ts`
- **修改**:
  - `WorkflowStageConfig` 添加 `assistants` 字段
  - `WorkflowStageUpdate` 添加 `assistants` 字段

#### 2. 流程配置页面
- **文件**: `frontend/src/pages/Settings.tsx`
- **修改**:
  - 添加协助人选择组件（多选下拉框）
  - 表单提交时包含协助人数据
  - 表单初始化时加载协助人数据

#### 3. 侧边栏组件
- **文件**: `frontend/src/components/Sidebar.tsx`
- **修改**: 删除未使用的 `userPermissions` 变量

### 数据库迁移

#### 1. SQL 迁移脚本
- **文件**: `backend/add_assistants_to_workflow.sql`
- **内容**: 为 `workflow_stages` 表添加 `assistants` 字段

#### 2. Python 迁移脚本
- **文件**: `backend/run_migration.py`
- **功能**: 执行数据库迁移并验证结果

## 数据库变更

```sql
ALTER TABLE workflow_stages 
ADD COLUMN IF NOT EXISTS assistants JSONB DEFAULT '[]'::jsonb;
```

## 使用说明

### 1. 超级管理员审批

超级管理员登录后：
1. 可以在审批工作台看到所有审批任务（设置 `filter_by_user=False`）
2. 可以审批任何阶段的任务，无需被指派
3. 即使不是任务负责人或协助人，也可以进行审批操作

### 2. 配置协助人

在系统设置 → 流程配置页面：
1. 选择需要配置的审批阶段
2. 在"负责人"下方找到"协助人"选择框
3. 可以选择多个协助人（多选下拉框）
4. 协助人可以为空（不是必填项）
5. 点击"保存流程配置"

### 3. 协助人审批

协助人登录后：
1. 在审批工作台可以看到被指派为协助人的任务
2. 可以像负责人一样进行审批、退回等操作
3. 操作权限与负责人相同

## 权限逻辑

任务操作权限判断顺序：
1. **超级管理员** → 允许操作所有任务
2. **任务负责人** → 允许操作自己负责的任务
3. **被指派人员**（包括协助人）→ 允许操作被指派的任务
4. **其他用户** → 拒绝操作

## 数据流程

创建审批任务时：
1. 系统读取流程配置中的负责人和协助人
2. 将负责人添加到 `assignees` 列表
3. 查询所有协助人的用户信息
4. 将协助人的姓名添加到 `assignees` 列表
5. 创建审批任务，负责人和协助人都可以看到并操作该任务

## 测试建议

### 1. 超级管理员权限测试
- [ ] 超级管理员可以看到所有审批任务
- [ ] 超级管理员可以审批不属于自己的任务
- [ ] 超级管理员可以退回任何任务
- [ ] 非超级管理员无法操作不属于自己的任务

### 2. 协助人功能测试
- [ ] 在流程配置中添加协助人
- [ ] 创建新的合同审批流程
- [ ] 协助人可以看到被指派的任务
- [ ] 协助人可以成功审批任务
- [ ] 协助人可以退回任务
- [ ] 协助人为空时系统正常运行

### 3. 待复核统计测试
- [ ] 完成所有审批流程后，仪表盘"待复核"显示为0
- [ ] 有待处理的复核任务时，"待复核"显示正确数量
- [ ] OCR 置信度低不再影响"待复核"统计

## 回滚方案

如需回滚此功能：

```sql
-- 删除 assistants 字段
ALTER TABLE workflow_stages DROP COLUMN IF EXISTS assistants;
```

然后恢复修改前的代码文件。

## 注意事项

1. 协助人功能是可选的，可以不配置
2. 超级管理员权限较大，建议谨慎授予
3. 现有的审批任务不会自动更新协助人，只有新创建的任务才会包含协助人
4. 如果需要为现有任务添加协助人，需要手动更新数据库或重新创建审批流程

## 相关问题修复

### 待复核统计问题
- **问题**: 即使所有审批流程都已完成，仪表盘仍显示有待复核项
- **原因**: 原来基于 OCR 置信度统计，与实际审批流程状态不符
- **解决**: 改为基于审批任务表中"复核归档"阶段的待处理任务数量统计

