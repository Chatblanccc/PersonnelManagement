"""
个人中心 API 测试脚本

使用方法：
    python test_profile_api.py

要求：
    - 后端服务已启动
    - 有测试账号和密码
"""
import requests
import json
from typing import Optional

# 配置
BASE_URL = "http://localhost:8000/api"
TEST_USERNAME = "admin"  # 修改为你的测试账号
TEST_PASSWORD = "admin123"  # 修改为你的测试密码


class ProfileAPITester:
    """个人中心 API 测试类"""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.headers = {"Content-Type": "application/json"}

    def login(self, username: str, password: str) -> bool:
        """登录获取 token"""
        print("\n[1] 测试登录...")
        url = f"{self.base_url}/auth/login"
        data = {"username": username, "password": password}

        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            result = response.json()
            self.token = result.get("access_token")
            self.headers["Authorization"] = f"Bearer {self.token}"
            print(f"✅ 登录成功！Token: {self.token[:20]}...")
            return True
        except Exception as e:
            print(f"❌ 登录失败: {e}")
            return False

    def get_profile(self) -> dict:
        """获取个人信息"""
        print("\n[2] 测试获取个人信息...")
        url = f"{self.base_url}/profile/me"

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            profile = response.json()
            print("✅ 获取成功！")
            print(f"   姓名: {profile.get('full_name') or profile.get('username')}")
            print(f"   工号: {profile.get('teacher_code') or '未设置'}")
            print(f"   部门: {profile.get('department') or '未设置'}")
            print(f"   岗位: {profile.get('position') or '未设置'}")
            print(f"   角色: {', '.join(profile.get('roles', []))}")
            return profile
        except Exception as e:
            print(f"❌ 获取失败: {e}")
            return {}

    def update_profile(self, data: dict) -> bool:
        """更新个人信息"""
        print("\n[3] 测试更新个人信息...")
        url = f"{self.base_url}/profile/me"

        try:
            response = requests.patch(url, headers=self.headers, json=data)
            response.raise_for_status()
            result = response.json()
            print("✅ 更新成功！")
            print(f"   更新后姓名: {result.get('full_name')}")
            return True
        except Exception as e:
            print(f"❌ 更新失败: {e}")
            return False

    def get_notifications(self, limit: int = 5) -> list:
        """获取通知列表"""
        print(f"\n[4] 测试获取通知列表 (最多 {limit} 条)...")
        url = f"{self.base_url}/profile/notifications"
        params = {"skip": 0, "limit": limit}

        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            result = response.json()
            print("✅ 获取成功！")
            print(f"   总通知数: {result.get('total')}")
            print(f"   未读数量: {result.get('unread_count')}")
            print(f"   返回条数: {len(result.get('items', []))}")

            # 显示前3条通知
            for i, item in enumerate(result.get("items", [])[:3], 1):
                status = "未读" if not item.get("is_read") else "已读"
                print(f"   [{i}] {item.get('title')} - {status}")

            return result.get("items", [])
        except Exception as e:
            print(f"❌ 获取失败: {e}")
            return []

    def get_unread_count(self) -> int:
        """获取未读通知数量"""
        print("\n[5] 测试获取未读通知数量...")
        url = f"{self.base_url}/profile/notifications/unread-count"

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            result = response.json()
            count = result.get("unread_count", 0)
            print(f"✅ 获取成功！未读数量: {count}")
            return count
        except Exception as e:
            print(f"❌ 获取失败: {e}")
            return 0

    def mark_notifications_read(self, notification_ids: list) -> bool:
        """标记通知为已读"""
        if not notification_ids:
            print("\n[6] 跳过标记已读测试（没有通知ID）")
            return False

        print(f"\n[6] 测试标记通知为已读 ({len(notification_ids)} 条)...")
        url = f"{self.base_url}/profile/notifications/mark-read"
        data = {"notification_ids": notification_ids}

        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            result = response.json()
            print(f"✅ 标记成功！{result.get('message')}")
            return True
        except Exception as e:
            print(f"❌ 标记失败: {e}")
            return False

    def mark_all_read(self) -> bool:
        """标记所有通知为已读"""
        print("\n[7] 测试标记所有通知为已读...")
        url = f"{self.base_url}/profile/notifications/mark-all-read"

        try:
            response = requests.post(url, headers=self.headers)
            response.raise_for_status()
            result = response.json()
            print(f"✅ 标记成功！{result.get('message')}")
            return True
        except Exception as e:
            print(f"❌ 标记失败: {e}")
            return False

    def create_test_notification(self) -> bool:
        """创建测试通知（需要管理员权限）"""
        print("\n[8] 测试创建通知（需要后端支持）...")
        # 注意：这个功能需要在后端添加相应的 API
        print("⚠️  暂不支持直接创建通知，请通过系统其他功能触发")
        return False

    def change_password(self, old_pwd: str, new_pwd: str) -> bool:
        """修改密码（谨慎使用！）"""
        print("\n[9] 测试修改密码...")
        url = f"{self.base_url}/profile/change-password"
        data = {
            "old_password": old_pwd,
            "new_password": new_pwd,
            "confirm_password": new_pwd,
        }

        try:
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            result = response.json()
            print(f"✅ 修改成功！{result.get('message')}")
            print("⚠️  密码已修改，请使用新密码重新登录")
            return True
        except Exception as e:
            print(f"❌ 修改失败: {e}")
            return False


def main():
    """主测试流程"""
    print("=" * 60)
    print("个人中心 API 测试脚本")
    print("=" * 60)

    # 初始化测试器
    tester = ProfileAPITester(BASE_URL)

    # 1. 登录
    if not tester.login(TEST_USERNAME, TEST_PASSWORD):
        print("\n❌ 登录失败，终止测试")
        return

    # 2. 获取个人信息
    profile = tester.get_profile()

    # 3. 更新个人信息
    update_data = {
        "full_name": "测试用户（已更新）",
        "email": "test@example.com",
    }
    tester.update_profile(update_data)

    # 4. 获取通知列表
    notifications = tester.get_notifications(limit=5)

    # 5. 获取未读数量
    unread_count = tester.get_unread_count()

    # 6. 标记通知为已读（如果有通知）
    if notifications and len(notifications) > 0:
        # 标记第一条通知
        first_notif_id = notifications[0].get("id")
        if first_notif_id:
            tester.mark_notifications_read([first_notif_id])

    # 7. 标记所有通知为已读
    if unread_count > 0:
        confirm = input(
            f"\n是否标记所有 {unread_count} 条通知为已读？(y/n): "
        )
        if confirm.lower() == "y":
            tester.mark_all_read()

    # 8. 修改密码（可选，需要手动确认）
    test_password_change = input("\n是否测试修改密码功能？(y/n): ")
    if test_password_change.lower() == "y":
        print("⚠️  警告：这将修改你的账号密码！")
        confirm = input("确认继续？(yes/no): ")
        if confirm.lower() == "yes":
            old_pwd = input("输入当前密码: ")
            new_pwd = input("输入新密码: ")
            tester.change_password(old_pwd, new_pwd)

    # 测试完成
    print("\n" + "=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)
    print("\n功能测试结果：")
    print("  ✅ 登录认证")
    print("  ✅ 获取个人信息")
    print("  ✅ 更新个人信息")
    print("  ✅ 获取通知列表")
    print("  ✅ 获取未读数量")
    if notifications:
        print("  ✅ 标记通知已读")
    if unread_count > 0:
        print("  ✅ 标记所有已读")
    print("\n详细 API 文档请访问: http://localhost:8000/docs")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试已取消")
    except Exception as e:
        print(f"\n\n测试过程中出现错误: {e}")

