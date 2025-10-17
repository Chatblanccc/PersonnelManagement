"""简化的数据库迁移脚本"""
from sqlalchemy import text
from app.database import engine

def run_migration():
    """运行迁移"""
    print("正在执行数据库迁移...")
    
    sqls = [
        # 1. 添加 users 表字段
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_status VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
        
        # 2. 添加索引
        "CREATE INDEX IF NOT EXISTS idx_users_teacher_code ON users(teacher_code)",
        
        # 3. 创建通知表
        """CREATE TABLE IF NOT EXISTS notifications (
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
        )""",
        
        # 4. 添加通知表索引
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)",
    ]
    
    try:
        with engine.begin() as conn:
            for i, sql in enumerate(sqls, 1):
                print(f"[{i}/{len(sqls)}] 执行中...")
                conn.execute(text(sql))
        
        print("\n✅ 迁移成功完成！\n")
        print("已添加字段:")
        print("  • users.avatar_url")
        print("  • users.teacher_code")
        print("  • users.department")
        print("  • users.position")
        print("  • users.job_status")
        print("  • users.phone_number\n")
        print("已创建表:")
        print("  • notifications\n")
        print("已创建索引:")
        print("  • idx_users_teacher_code")
        print("  • idx_notifications_user_id")
        print("  • idx_notifications_is_read")
        print("  • idx_notifications_created_at\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    run_migration()

