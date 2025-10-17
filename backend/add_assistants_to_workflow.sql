-- 为 workflow_stages 表添加 assistants 字段
-- 该字段用于存储协助人的用户ID列表

ALTER TABLE workflow_stages 
ADD COLUMN IF NOT EXISTS assistants JSONB DEFAULT '[]'::jsonb;

-- 添加注释
COMMENT ON COLUMN workflow_stages.assistants IS '协助人用户ID列表，这些用户可以代替负责人进行审批操作';

-- 更新说明
-- 此迁移脚本为流程配置添加协助人功能
-- 执行后，系统设置中的流程配置将支持为每个审批阶段配置多个协助人
-- 超级管理员可以审批所有任务，协助人可以审批被指派的任务

