-- 个人中心功能数据库迁移脚本
-- 添加用户表新字段和通知表

-- 1. 为 users 表添加新字段（如果不存在）
ALTER TABLE IF EXISTS users 
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department VARCHAR(50),
  ADD COLUMN IF NOT EXISTS position VARCHAR(50),
  ADD COLUMN IF NOT EXISTS job_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- 为 teacher_code 添加索引
CREATE INDEX IF NOT EXISTS idx_users_teacher_code ON users(teacher_code);

-- 2. 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_contract_id VARCHAR(36) REFERENCES contracts(id) ON DELETE SET NULL,
    related_approval_id VARCHAR(36) REFERENCES approval_tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为通知表创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. 创建上传目录（需要手动在文件系统中创建）
-- mkdir -p uploads/avatars

COMMENT ON TABLE notifications IS '通知消息表';
COMMENT ON COLUMN notifications.type IS '通知类型: approval_pending, approval_approved, approval_rejected, contract_expiring, system, info';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.link_url IS '跳转链接';

COMMENT ON COLUMN users.avatar_url IS '用户头像URL';
COMMENT ON COLUMN users.teacher_code IS '员工工号';
COMMENT ON COLUMN users.department IS '部门';
COMMENT ON COLUMN users.position IS '岗位';
COMMENT ON COLUMN users.job_status IS '在职状态';
COMMENT ON COLUMN users.phone_number IS '电话号码';

