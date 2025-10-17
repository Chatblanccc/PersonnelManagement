"""
测试发送提醒 API 的脚本
"""
import requests
import json

# 配置
BASE_URL = "http://localhost:8000/api"
# 请替换为你的实际 token
ACCESS_TOKEN = "your_access_token_here"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 测试1: 通过教师姓名和部门发送提醒
def test_send_reminder_by_teacher():
    print("\n=== 测试1: 通过教师姓名和部门发送提醒 ===")
    
    # 请替换为实际的教师姓名和部门
    params = {
        "teacher_name": "张三",
        "department": "数学组"
    }
    
    response = requests.post(
        f"{BASE_URL}/approvals/tasks/send-reminder",
        params=params,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    return response

# 测试2: 通过合同ID发送提醒
def test_send_reminder_by_contract():
    print("\n=== 测试2: 通过合同ID发送提醒 ===")
    
    # 请替换为实际的合同ID
    params = {
        "contract_id": "your_contract_id_here"
    }
    
    response = requests.post(
        f"{BASE_URL}/approvals/tasks/send-reminder",
        params=params,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    return response

# 测试3: 获取审批任务列表（用于获取实际数据）
def test_get_approval_tasks():
    print("\n=== 测试3: 获取审批任务列表 ===")
    
    response = requests.get(
        f"{BASE_URL}/approvals/tasks",
        headers=headers,
        params={"page": 1, "page_size": 10}
    )
    
    print(f"状态码: {response.status_code}")
    data = response.json()
    
    if data.get("data") and len(data["data"]) > 0:
        first_task = data["data"][0]
        print(f"\n找到审批任务:")
        print(f"  - 教师姓名: {first_task.get('teacher_name')}")
        print(f"  - 部门: {first_task.get('department')}")
        print(f"  - 合同ID: {first_task.get('contract_id')}")
        print(f"  - 状态: {first_task.get('status')}")
        print(f"  - 负责人: {first_task.get('owner')}")
        return first_task
    else:
        print("没有找到审批任务")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("审批提醒 API 测试脚本")
    print("=" * 60)
    
    print("\n请先确保:")
    print("1. 后端服务正在运行 (http://localhost:8000)")
    print("2. 已经修改脚本中的 ACCESS_TOKEN")
    print("3. 数据库中有审批任务数据")
    
    # 先获取审批任务列表
    task = test_get_approval_tasks()
    
    if task:
        # 使用实际数据测试发送提醒
        print("\n" + "=" * 60)
        print("使用实际数据测试发送提醒")
        print("=" * 60)
        
        params = {
            "teacher_name": task.get("teacher_name"),
            "department": task.get("department")
        }
        
        print(f"\n发送参数: {params}")
        
        response = requests.post(
            f"{BASE_URL}/approvals/tasks/send-reminder",
            params=params,
            headers=headers
        )
        
        print(f"\n状态码: {response.status_code}")
        print(f"响应内容: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    else:
        print("\n无法进行测试，请先添加审批任务数据")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

