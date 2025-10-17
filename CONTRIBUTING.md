# 贡献指南

感谢您对教师合同管理系统的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请通过 GitHub Issues 提交，并包含以下信息：

1. **Bug 描述**：清晰简洁地描述问题
2. **复现步骤**：详细的复现步骤
3. **期望行为**：您期望发生什么
4. **实际行为**：实际发生了什么
5. **环境信息**：
   - 操作系统
   - Python 版本
   - Node.js 版本
   - 浏览器（如果是前端问题）
6. **截图**：如果可能，提供截图

### 提交功能请求

如果您有新功能建议，请通过 GitHub Issues 提交，并说明：

1. **功能描述**：您希望添加什么功能
2. **使用场景**：这个功能将解决什么问题
3. **替代方案**：是否考虑过其他方案

### 提交代码

1. **Fork 项目**

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **编写代码**
   - 遵循项目的代码风格
   - 添加必要的注释
   - 编写单元测试（如适用）

4. **提交代码**
   ```bash
   git commit -m "feat: 添加 XXX 功能"
   ```
   
   提交信息格式：
   - `feat`: 新功能
   - `fix`: Bug 修复
   - `docs`: 文档更新
   - `style`: 代码格式（不影响功能）
   - `refactor`: 重构
   - `test`: 测试相关
   - `chore`: 构建/工具相关

5. **推送到远程**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 清晰描述您的改动
   - 关联相关的 Issue（如有）

## 代码规范

### Python 代码

- 遵循 PEP 8 规范
- 使用 Black 进行代码格式化
- 使用 type hints
- 编写清晰的文档字符串

```python
def process_contract(file_path: str) -> Dict[str, Any]:
    """
    处理合同文件并提取信息
    
    Args:
        file_path: 合同文件路径
        
    Returns:
        包含提取字段的字典
        
    Raises:
        ValueError: 文件格式不支持
    """
    pass
```

### TypeScript/React 代码

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用函数式组件和 Hooks
- 组件名使用 PascalCase，文件名使用 PascalCase

```typescript
interface Props {
  data: Contract[]
  onUpdate: (id: string, data: Partial<Contract>) => void
}

const ContractList: React.FC<Props> = ({ data, onUpdate }) => {
  // ...
}
```

## 开发流程

### 设置开发环境

1. 按照 QUICKSTART.md 设置基础环境
2. 安装开发工具
   ```bash
   # Python
   pip install black flake8 pytest
   
   # Node.js
   npm install -g eslint prettier
   ```

### 运行测试

```bash
# 后端测试
cd backend
pytest

# 前端测试
cd frontend
npm test
```

### 代码检查

```bash
# Python
black backend/
flake8 backend/

# TypeScript
cd frontend
npm run lint
```

## 项目结构

```
PersonnelManagement/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/      # 页面
│   │   ├── api/        # API 调用
│   │   ├── hooks/      # 自定义 Hooks
│   │   ├── store/      # 状态管理
│   │   └── utils/      # 工具函数
│   └── package.json
│
├── backend/           # 后端项目
│   ├── app/
│   │   ├── models/    # 数据库模型
│   │   ├── routers/   # API 路由
│   │   ├── services/  # 业务逻辑
│   │   ├── schemas/   # Pydantic 模型
│   │   ├── ocr/       # OCR 模块
│   │   └── utils/     # 工具函数
│   └── requirements.txt
│
└── docs/             # 文档
```

## 提问

如果您有任何问题，可以：

1. 查看现有的 Issues 和 Pull Requests
2. 阅读项目文档
3. 创建新的 Issue 提问

## 行为准则

- 保持友善和尊重
- 欢迎各种形式的贡献
- 专注于技术讨论
- 尊重他人的观点

## License

通过贡献代码，您同意您的贡献将按照 MIT License 开源。

---

再次感谢您的贡献！ 🎉

