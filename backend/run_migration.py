"""执行数据库迁移脚本"""
import sys
from sqlalchemy import text
from app.database import engine

def run_migration():
    """运行 SQL 迁移脚本"""
    print("正在执行数据库迁移...")
    
    # 读取 SQL 文件
    with open('add_profile_features.sql', 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # 分割并执行每个 SQL 语句
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    try:
        with engine.begin() as conn:
            for i, statement in enumerate(statements, 1):
                if statement and not statement.startswith('--'):
                    print(f"执行语句 {i}/{len(statements)}...")
                    conn.execute(text(statement))
        
        print("\n✓ 迁移成功完成！")
        print("\n已添加的字段：")
        print("  - users.avatar_url")
        print("  - users.teacher_code")
        print("  - users.department")
        print("  - users.position")
        print("  - users.job_status")
        print("  - users.phone_number")
        print("\n已创建的表：")
        print("  - notifications")
        print("\n已创建的索引：")
        print("  - idx_users_teacher_code")
        print("  - idx_notifications_user_id")
        print("  - idx_notifications_is_read")
        print("  - idx_notifications_created_at")
        
        return True
        
    except Exception as e:
        print(f"\n✗ 迁移失败: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

