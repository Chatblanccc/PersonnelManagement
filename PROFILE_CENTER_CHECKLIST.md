# 个人中心功能部署检查清单

## 📋 部署前检查

### 1. 后端文件检查

- [x] `backend/app/models/user.py` - User 模型已扩展
- [x] `backend/app/models/notification.py` - Notification 模型已创建
- [x] `backend/app/models/__init__.py` - 模型已导出
- [x] `backend/app/schemas/profile.py` - Schema 已定义
- [x] `backend/app/services/profile_service.py` - 服务层已实现
- [x] `backend/app/routers/profile.py` - 路由已创建
- [x] `backend/app/routers/__init__.py` - 路由已导出
- [x] `backend/main.py` - 路由已注册
- [x] `backend/add_profile_features.sql` - 迁移脚本已创建
- [x] `backend/test_profile_api.py` - 测试脚本已创建

### 2. 前端文件检查

- [x] `frontend/src/api/profile.ts` - API 客户端已创建
- [x] `frontend/src/hooks/useProfile.ts` - Hooks 已创建
- [x] `frontend/src/pages/Profile.tsx` - 页面组件已创建
- [x] `frontend/src/components/Navbar.tsx` - 导航栏已更新
- [x] `frontend/src/App.tsx` - 路由已配置

### 3. 文档检查

- [x] `PROFILE_CENTER_GUIDE.md` - 完整指南
- [x] `PROFILE_CENTER_SUMMARY.md` - 开发总结
- [x] `PROFILE_CENTER_QUICKREF.md` - 快速参考
- [x] `PROFILE_CENTER_DEMO.md` - 功能演示
- [x] `PROFILE_CENTER_CHECKLIST.md` - 本检查清单
- [x] `README.md` - 已更新
- [x] `init-profile-center.bat` - 初始化脚本

---

## 🗄️ 数据库部署步骤

### Step 1: 备份数据库（重要！）
```bash
pg_dump -U postgres -d personnel_management > backup_$(date +%Y%m%d_%H%M%S).sql
```
- [ ] 已完成数据库备份

### Step 2: 执行迁移脚本
```bash
psql -U postgres -d personnel_management -f backend/add_profile_features.sql
```
- [ ] 已执行迁移脚本
- [ ] 已验证 users 表新字段
- [ ] 已验证 notifications 表创建
- [ ] 已验证索引创建

### Step 3: 验证数据库
```sql
-- 检查 users 表字段
\d users

-- 检查 notifications 表
\d notifications

-- 检查索引
\di

-- 测试查询
SELECT avatar_url, teacher_code, department FROM users LIMIT 1;
SELECT COUNT(*) FROM notifications;
```
- [ ] users 表包含新字段
- [ ] notifications 表结构正确
- [ ] 索引已创建

---

## 📁 文件系统部署步骤

### Step 1: 创建上传目录
```bash
# Windows
mkdir backend\uploads\avatars
mkdir uploads\avatars

# Linux/Mac
mkdir -p backend/uploads/avatars
mkdir -p uploads/avatars
```
- [ ] 已创建 backend/uploads/avatars
- [ ] 已创建 uploads/avatars

### Step 2: 设置目录权限（Linux/Mac）
```bash
chmod 755 backend/uploads/avatars
chmod 755 uploads/avatars
```
- [ ] 已设置目录权限（Linux/Mac）
- [ ] N/A（Windows）

### Step 3: 验证目录
```bash
ls -la backend/uploads/
ls -la uploads/
```
- [ ] 目录存在且可访问

---

## 🔧 后端部署步骤

### Step 1: 检查依赖
```bash
cd backend
pip list | grep -E "fastapi|sqlalchemy|pydantic"
```
- [ ] FastAPI 已安装
- [ ] SQLAlchemy 已安装
- [ ] Pydantic 已安装

### Step 2: 重启后端服务
```bash
# 停止现有服务
# Ctrl+C 或 kill process

# 启动服务
python main.py
# 或
uvicorn main:app --reload
```
- [ ] 后端服务已重启
- [ ] 无启动错误

### Step 3: 验证 API
访问 http://localhost:8000/docs
- [ ] Swagger 文档可访问
- [ ] 看到 /profile 相关端点
- [ ] 端点数量正确（10个）

### Step 4: 测试 API
```bash
python backend/test_profile_api.py
```
- [ ] 登录测试通过
- [ ] 获取个人信息通过
- [ ] 更新信息通过
- [ ] 通知相关测试通过

---

## 🎨 前端部署步骤

### Step 1: 检查依赖
```bash
cd frontend
npm list react antd
```
- [ ] React 已安装
- [ ] Ant Design 已安装
- [ ] @tanstack/react-query 已安装

### Step 2: 重启前端服务
```bash
# 停止现有服务
# Ctrl+C

# 启动服务
npm run dev
```
- [ ] 前端服务已重启
- [ ] 无编译错误

### Step 3: 验证页面
访问 http://localhost:5173
- [ ] 登录页面正常
- [ ] 导航栏显示通知图标
- [ ] 个人中心按钮可见

### Step 4: 测试功能
- [ ] 可访问 /profile 页面
- [ ] 三个页签可正常切换
- [ ] 基础信息页面正常显示
- [ ] 安全设置页面正常显示
- [ ] 通知消息页面正常显示

---

## 🧪 功能测试步骤

### 基础信息模块
- [ ] 头像显示正常（默认图标或已上传头像）
- [ ] 个人信息卡片显示完整
- [ ] 点击"更换头像"可上传
  - [ ] 上传 jpg 成功
  - [ ] 上传 png 成功
  - [ ] 上传超大文件被拒绝
  - [ ] 上传非图片文件被拒绝
- [ ] 点击"编辑"可修改信息
  - [ ] 修改姓名成功
  - [ ] 修改邮箱成功（格式验证）
  - [ ] 修改电话成功（格式验证）
  - [ ] 保存后立即显示新信息

### 安全设置模块
- [ ] 点击"修改"显示密码表单
- [ ] 密码长度验证（至少6位）
- [ ] 新密码确认验证
- [ ] 当前密码验证
  - [ ] 错误密码被拒绝
  - [ ] 正确密码可通过
- [ ] 修改成功显示提示

### 通知消息模块
- [ ] 通知列表正常显示
- [ ] 未读通知有蓝色背景
- [ ] 通知类型标签显示正确
- [ ] 点击通知标记为已读
- [ ] 点击"仅未读"筛选正确
- [ ] 点击"全部已读"批量标记
- [ ] 点击删除按钮删除通知
- [ ] 确认对话框正常显示
- [ ] 通知自动刷新（等待30秒）

### 导航栏集成
- [ ] 通知图标显示未读徽章
- [ ] 徽章数字正确
- [ ] 点击铃铛跳转通知页
- [ ] 个人中心下拉菜单正常
- [ ] 点击菜单项跳转正确
- [ ] 未读数量自动更新（等待15秒）

---

## 🔍 性能测试

### 页面加载
- [ ] 个人信息页加载 < 1秒
- [ ] 通知列表加载 < 1秒
- [ ] 头像上传响应 < 3秒

### 数据刷新
- [ ] 通知列表轮询正常（30秒）
- [ ] 未读数量轮询正常（15秒）
- [ ] 不会造成性能问题

### 缓存机制
- [ ] 个人信息有缓存（不频繁请求）
- [ ] 缓存失效正常（5分钟）
- [ ] 更新后缓存刷新

---

## 🔒 安全测试

### 认证授权
- [ ] 未登录无法访问 API
- [ ] Token 过期自动跳转登录
- [ ] 无法访问他人信息

### 数据验证
- [ ] 文件类型验证有效
- [ ] 文件大小验证有效
- [ ] 表单验证有效
- [ ] SQL 注入防护有效

### 密码安全
- [ ] 密码 bcrypt 加密存储
- [ ] 不返回密码哈希
- [ ] 修改需验证当前密码

---

## 📱 兼容性测试

### 浏览器
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Edge（最新版）
- [ ] Safari（如适用）

### 设备
- [ ] 桌面端（1920x1080）
- [ ] 笔记本（1366x768）
- [ ] 平板（768x1024）
- [ ] 手机（375x667）

### 响应式
- [ ] 布局自适应正常
- [ ] 图片大小调整正常
- [ ] 触摸操作正常

---

## 📊 监控配置

### 日志记录
- [ ] 上传操作有日志
- [ ] 密码修改有日志
- [ ] 错误有日志记录
- [ ] 日志级别合适

### 性能监控
- [ ] API 响应时间监控
- [ ] 数据库查询监控
- [ ] 文件上传监控

---

## 📚 文档检查

### 用户文档
- [ ] 功能说明清晰
- [ ] 操作步骤明确
- [ ] 常见问题列出

### 技术文档
- [ ] API 文档完整
- [ ] 数据模型说明清楚
- [ ] 部署步骤详细

### 开发文档
- [ ] 代码注释充分
- [ ] 函数说明清楚
- [ ] 类型定义完整

---

## 🎯 生产环境准备

### 配置检查
- [ ] 数据库连接配置正确
- [ ] 文件上传路径配置正确
- [ ] CORS 配置合适
- [ ] 环境变量设置

### 安全加固
- [ ] 更换默认密码
- [ ] 关闭调试模式
- [ ] 配置 HTTPS
- [ ] 设置安全头

### 备份计划
- [ ] 数据库定期备份
- [ ] 上传文件定期备份
- [ ] 配置文件备份

---

## ✅ 最终确认

### 核心功能
- [ ] 所有功能正常工作
- [ ] 无重大 bug
- [ ] 性能满足要求
- [ ] 用户体验良好

### 文档完整
- [ ] 所有文档已创建
- [ ] 文档内容准确
- [ ] 示例代码可运行

### 团队准备
- [ ] 开发团队已培训
- [ ] 测试团队已培训
- [ ] 运维团队已培训
- [ ] 用户培训材料准备

---

## 🚀 上线确认

**上线日期：** ________________

**负责人签字：** ________________

**复核人签字：** ________________

---

## 📞 支持联系

如遇到问题，请联系：
- 开发团队：[联系方式]
- 技术支持：[联系方式]
- 紧急热线：[联系方式]

---

**注意事项：**
1. 生产环境部署前必须完成所有检查项
2. 遇到问题及时记录并寻求支持
3. 保持部署日志以便追溯
4. 准备回滚方案以防万一

