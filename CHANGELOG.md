# 更新日志

本项目的所有重要更改都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2024-01-15

### 新增
- ✨ 智能 OCR 识别功能，支持 PDF 和图片格式
- 📋 40+ 字段的合同信息管理
- 🔒 敏感信息 AES256 加密存储
- 📊 合同列表的筛选、搜索和分页
- ✏️ 在线编辑合同信息
- 📥 导出 Excel 功能
- 🎨 现代化的 UI 界面（Tailwind + Ant Design）
- 📈 仪表盘统计功能
- 🔐 JWT 身份认证
- 📝 完整的 API 文档

### 技术栈
- 前端：React 18 + TypeScript + Vite + TailwindCSS + Ant Design 5.0
- 后端：FastAPI + Python 3.11 + SQLAlchemy
- 数据库：PostgreSQL 15
- OCR：PaddleOCR

### 文档
- README.md - 项目介绍和功能说明
- QUICKSTART.md - 快速开始指南
- DEPLOYMENT.md - 部署文档
- API.md - API 接口文档

## [未来计划]

### v1.1.0
- [ ] 用户权限管理（RBAC）
- [ ] 操作审计日志
- [ ] 合同到期提醒（邮件/短信）
- [ ] 批量上传功能
- [ ] 合同模板管理

### v1.2.0
- [ ] OCR 模型微调优化
- [ ] 支持更多合同类型
- [ ] 移动端适配
- [ ] 数据统计报表
- [ ] 导出 PDF 功能

### v2.0.0
- [ ] 微服务架构重构
- [ ] 多租户支持
- [ ] 高可用部署方案
- [ ] 性能优化（缓存、CDN）
- [ ] 国际化支持

