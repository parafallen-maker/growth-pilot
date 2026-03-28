# Changelog

本文件记录 GrowthPilot 各阶段的主要变更，便于追踪"什么时候做了什么"。

---

## Wave 3 — 生产加固（进行中）

### 安全与性能（BE-30 ~ BE-43）✅
- CORS 白名单 + Helmet 安全头 + 全局 Rate Limiting
- JWT Secret 强制校验（≥32 字符）、bcrypt 密码哈希（cost 12）
- 敏感字段脱敏 interceptor、结构化 JSON 日志
- DB 连接池（min 5 / max 20）、分页上限 100、文件上传限制 20MB
- 健康检查 `/health` + `/health/ready`、全局异常过滤器

### 容器化与 CI/CD（INF-10 ~ INF-21）✅
- API / Web 多阶段 Dockerfile
- `docker-compose.prod.yml`（api + web + postgres + redis + minio + nginx）
- Nginx 反向代理 + gzip + 静态缓存 + TLS 预留
- CI: lint → typecheck → test → Docker build → GHCR push
- CD: SSH 部署 + 健康检查 + 自动回滚
- DB 日备份 cron（保留 30 天）+ Let's Encrypt / 自签 SSL 脚本

---

## Wave 2 — 收口与验收（进行中）

### QA 测试（QA-01 ~ QA-17）
- 5 条 E2E 主流程全部 PASS（学生建档、作业复核、成长目标、账单收款、设备签到）
- API 合约验证 31/31 PASS（OpenAPI 89+ operations 覆盖）
- 数据迁移验证：staging import 幂等性、reject report、本地 PostgreSQL apply 通过
- SSR compiled smoke 31/31 routes（29 ok + 2 redirect + 0 error）
- 预发上线清单 + 回滚方案就绪

---

## Wave 1 — 接真（已完成）

### 后端真化（BE-01 ~ BE-25）✅
- Drizzle + PostgreSQL 全模块替换 FileJsonStore（12 个业务模块）
- Repository 抽象层：DB adapter + file adapter fallback
- 5 个缺失接口补齐（学生导入、家庭任务、教师发展记录、用户创建、rubric 统一 templateId）
- Redis 接入（session cache + rate limit + BullMQ worker）
- MinIO/S3 文件上传适配器

### 前端去 mock 接真（FE-01 ~ FE-26）✅
- 登录页 → AppShell → API Client 统一层
- 31 个骨架页接入真实 API + 表单交互
- 权限裁剪、中文本地化、P0 功能框架 V2

---

## Wave 0 — 启动门（已完成）

### INFRA（INF-01 ~ INF-08）✅
- 仓库可运行：`npm ci && npm run ci:check` 通过
- Docker Compose（PostgreSQL 16 + Redis 7 + MinIO）
- Drizzle 依赖预装

### SPEC（SPEC-01 ~ SPEC-05）✅
- 文档与代码对齐：OpenAPI ≥ 89 operations
- 5 个冲突接口决定落地
- 文档索引 + 阅读顺序建立
