# growth-pilot monorepo

GrowthPilot 当前处于 **Persisted JSON Beta**：后端业务模块与主要路由已成型，前端 31 个页面骨架已就绪，当前以文件 / JSON 持久化跑通主流程，并为 Wave 1 的 PostgreSQL / Redis / MinIO 真化做铺垫。

## Workspace layout

- `apps/web`: Next.js 15 + React 19 + TypeScript，31 页业务骨架与统一状态组件
- `apps/api`: NestJS 11 + TypeScript，auth/users/settings/students/families/teachers/homework/growth/attendance/billing/communication/jobs/analytics 模块已落地
- `packages/ui`: 共享 UI 组件
- `packages/schema`: 共享 schema / DTO / 类型契约
- `packages/config`: 共享配置常量
- `docs/growthpilot/`: 产品、架构、DDL、OpenAPI、迁移、执行总 Todo

## Scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run dev:all`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run typecheck`
- `npm run test`
- `npm run ci:check`
- `npm run smoke:api`
- `npm run clean`

## Quick start

### 1) 安装依赖

```bash
npm install
```

### 2) 启动本地基础设施（PostgreSQL / Redis / MinIO）

```bash
docker compose up -d
```

默认开发环境见 `.env.example`：
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`

### 3) 启动应用

```bash
npm run dev:api
npm run dev:web
```

或并行启动：

```bash
npm run dev:all
```

### 4) 基础校验

```bash
npm run lint
npm run typecheck
npm run test
npm run ci:check
```

## 文档索引

先看这里，少走弯路：

- `docs/growthpilot/00_start_here_merged.md` — 当前文档入口
- `docs/growthpilot/35_merged_agent_execution_todos.md` — Wave 0~5 执行总 Todo
- `docs/growthpilot/36_interface_decisions.md` — 接口冲突决策与兼容策略
- `docs/growthpilot/07_OpenAPI.yaml` — 机器可读 API 契约
- `docs/growthpilot/05_数据库DDL.sql` — 当前数据库结构基线

## 当前状态说明

1. 这已经不是“最小可运行脚手架”，而是 **Persisted JSON Beta**。
2. 后端模块完整度明显高于 README 旧描述，当前差的主要是真数据库、真对象存储、真队列与剩余缺口接口。
3. 前端不是空白页，而是已完成主流程页面骨架与一部分真实接口接线。
4. 接下来执行以 `docs/growthpilot/35_merged_agent_execution_todos.md` 为准。
