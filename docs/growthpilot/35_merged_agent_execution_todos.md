# 35 多 Agent 执行总 Todo

> **用途**：直接交给 AI Agent 执行的任务清单。每个 Agent 对应一个独立会话窗口。
> **Source of Truth**：本文件是执行层唯一准绳，冲突时以本文件为准。
> **当前仓库阶段**：Persisted JSON Beta（后端有完整模块但全用 JSON 文件持久化，前端有 31 页面但大部分静态骨架）

---

## 执行规则

1. **Wave 0 必须先过**，不允许跳过
2. 每个任务完成后标 `[x]`，阻塞标 `[!]`，进行中标 `[/]`
3. Agent 只允许修改自己"允许编辑"范围内的文件
4. 任何新增字段必须同步更新 `packages/schema/src/index.ts`
5. 任何新增接口必须同步更新 `docs/growthpilot/07_OpenAPI.yaml`

---

## Wave 0：启动门（必须先过）

### Agent INFRA — 仓库可运行

**目标**：让仓库在任何 clean 环境 `npm ci && npm run ci:check` 都能通过，API 能本地启动。

**允许编辑**：根目录配置文件、`apps/api/package.json`、`apps/api/tsconfig.json`、`.github/`、`.gitignore`

- [x] `INF-01` 在 `apps/api/package.json` 的 dependencies 中补齐 `@nestjs/platform-express`
  ```bash
  cd apps/api && npm install @nestjs/platform-express
  ```
- [x] `INF-02` 更新根目录 `.gitignore`，确保排除以下内容：
  ```
  node_modules/
  .next/
  dist/
  .data/
  .runtime/
  *.tsbuildinfo
  .env
  .env.local
  ```
- [x] `INF-03` 在根 `package.json` scripts 中新增：
  ```json
  "smoke:api": "cd apps/api && node -e \"require('./dist/main')\" || echo 'dist not built, run npm run build first'",
  "dev:all": "npm run dev:web & npm run dev:api",
  "clean": "rm -rf apps/*/dist apps/*/.next apps/*/tsconfig.tsbuildinfo packages/*/dist"
  ```
- [x] `INF-04` 在根目录创建 `docker-compose.yml`：
  ```yaml
  # PostgreSQL 16 + Redis 7 + MinIO
  # postgres: port 5432, db=growthpilot, user=gp, password=gp_dev
  # redis: port 6379
  # minio: port 9000, console 9001, user=minioadmin, password=minioadmin
  ```
- [x] `INF-05` 在根目录创建 `.env.example`：
  ```env
  DATABASE_URL=postgresql://gp:gp_dev@localhost:5432/growthpilot
  REDIS_URL=redis://localhost:6379
  JWT_SECRET=growthpilot-dev-secret
  JWT_ACCESS_TTL_SECONDS=900
  JWT_REFRESH_TTL_SECONDS=2592000
  S3_ENDPOINT=http://localhost:9000
  S3_ACCESS_KEY=minioadmin
  S3_SECRET_KEY=minioadmin
  S3_BUCKET=growthpilot-dev
  ```
- [x] `INF-06` 确保 `apps/api/.data/` 目录有 `.gitkeep` 但 JSON 运行时数据不提交
- [x] `INF-07` 执行验证：
  ```bash
  rm -rf node_modules apps/*/node_modules
  npm ci
  npm run lint
  npm run typecheck
  npm run test
  npm run build --workspace @growthpilot/api
  ```
- [x] `INF-08` 在 `apps/api/` 中安装 Drizzle 依赖（先装不用，给 Wave 1 铺路）：
  ```bash
  cd apps/api && npm install drizzle-orm pg && npm install -D drizzle-kit @types/pg
  ```

**验收**：
- `npm ci && npm run ci:check` 通过
- `npm run build --workspace @growthpilot/api` 通过
- API 能通过 `npm run dev:api` 启动且 health check 响应 200

---

### Agent SPEC — 文档与代码对齐

**目标**：消除文档与代码的所有已知差异，让后续 Agent 有唯一可信的文档基线。

**允许编辑**：`docs/growthpilot/`、根目录 `README.md`

- [x] `SPEC-01` 将以下 `hongji_vibe_docs` 文件复制到 `docs/growthpilot/` 并重命名：
  | 源文件 | 目标 |
  |---|---|
  | `01_scope_and_principles.md` | `35a_scope_and_principles.md` |
  | `02_prd.md` | `35b_prd.md` |
  | `04_development_spec.md` | `35c_development_spec.md` |
  | `06_seed_data.sql` | `35d_seed_data.sql` |
  | `11_data_dictionary.md` | `35e_data_dictionary.md` |
  | `08_page_prototypes.md` | `35f_page_prototypes.md` |
  | `09_excel_migration.md` | `35g_excel_migration.md` |

- [x] `SPEC-02` 将以下 5 个**文档有但代码缺失**的接口做出决定并记录：
  | 接口 | 建议决定 |
  |---|---|
  | `POST /students/import` | **保留，Wave 1 实现** |
  | `POST /families/{familyId}/tasks` | **保留，Wave 1 实现** |
  | `POST /teachers/{teacherId}/development-records` | **保留，Wave 1 实现** |
  | `POST /users` | **保留，Wave 1 实现** |
  | `GET /growth/rubrics/{rubricId}` vs `{templateId}` | **统一为 templateId**，更新文档 |

- [x] `SPEC-03` 将以下 30+ 个**代码有但文档缺失**的接口补入 `07_OpenAPI.yaml`：
  - files: GET /files/{fileId}, POST /files/upload, POST /files/upload/batch, POST /files/upload/multipart
  - homework: DELETE/PATCH /homework/error-taxonomies/{id}, POST /homework/error-taxonomies, GET /homework/outbox-events, GET/PUT /homework/submissions/{id}/review-draft
  - growth: GET /growth/reports/{id}, GET /growth/rubrics/{templateId}, POST /growth/reports/{id}/publish, POST /growth/reports/{id}/review
  - attendance: GET /attendance/devices/bindings, PATCH /attendance/devices/bindings/{id}, POST /attendance/devices
  - billing: GET /billing/contracts/{id}, GET /billing/payments/{id}, GET /billing/refunds/{id}, PATCH /billing/renewals/{id}/follow-up, PATCH /billing/renewals/{id}/status, POST /billing/renewals
  - communication: GET /communication/message-tasks, GET /communication/records/{id}, GET /communication/templates, PATCH /communication/message-tasks/{id}/status, PATCH /communication/templates/{id}, POST /communication/message-tasks, POST /communication/templates
  - jobs: GET /jobs

- [x] `SPEC-04` 更新 `README.md`：
  - 删除"当前是最小可运行脚手架"表述
  - 更新为"Persisted JSON Beta，后端模块完整，前端骨架就绪"
  - 新增 docker-compose 启动说明
  - 新增文档索引（指向本文件）

- [x] `SPEC-05` 在 `docs/growthpilot/` 创建 `00_start_here_merged.md`：
  - 列出当前文档优先级
  - 列出 Source of Truth 规则
  - 列出推荐阅读顺序

**验收**：
- OpenAPI 操作数 ≥ 89（与代码路由一致）
- 文档中不再有"骨架期"误导
- 5 个冲突接口有明确决定

---

## Wave 1：接真（INFRA/SPEC 验收后开始）

### Agent BACKEND — 后端真化

**目标**：
1. 定义 Repository 抽象层
2. 引入 Drizzle + PostgreSQL 替换 FileJsonStore
3. 补齐缺失接口

**允许编辑**：`apps/api/src/`、`packages/schema/src/`、`apps/api/drizzle/`

#### Phase 1：抽象层 + Drizzle Schema（先做）

- [x] `BE-01` 在 `apps/api/src/shared/persistence/` 创建 Repository 接口抽象：
  - 定义 `IRepository<T>` 接口（findById, findMany, create, update, delete）
  - 定义 `ITransactionRunner` 接口
  - 让现有 FileJsonStore 实现该接口（兼容模式）

- [x] `BE-02` 在 `apps/api/src/db/` 创建 Drizzle schema：
  - `schema/users.ts` — users, roles, user_roles, permissions
  - `schema/settings.ts` — campuses, terms, dictionaries
  - `schema/students.ts` — students, enrollments, student_labels
  - `schema/families.ts` — families, guardians, family_tasks
  - `schema/teachers.ts` — teachers, teacher_assignments, development_records
  - `schema/homework.ts` — homework_submissions, homework_ai_analyses, homework_reviews, homework_review_tags, error_taxonomies
  - `schema/growth.ts` — rubric_templates, rubric_dimensions, growth_observations, growth_goals, growth_goal_checkins, growth_reports
  - `schema/attendance.ts` — devices, device_bindings, attendance_events, homework_time_sessions, homework_time_daily_stats
  - `schema/billing.ts` — billing_products, contracts, contract_items, invoices, invoice_items, payments, refunds, renewals
  - `schema/communication.ts` — communication_records, message_templates, message_tasks
  - `schema/jobs.ts` — jobs, file_assets

- [x] `BE-03` 创建 `apps/api/drizzle.config.ts` + 第一批 migration
  ```bash
  cd apps/api && npx drizzle-kit generate --config drizzle.config.ts
  ```
  - 已补齐 workspace 根级 `drizzle-kit` / `drizzle-orm` 依赖，修复 CLI 从仓库根解析不到 `drizzle-orm` 的问题。
  - 已删除手工占位迁移，生成正式基线迁移：`apps/api/drizzle/0000_stormy_the_twelve.sql`。
  - `drizzle.config.ts` 改为显式引用 Phase 1 schema 文件，避免把当前工作树里未提交的后续 auth 草稿误卷入基线 migration。

- [x] `BE-04` 创建 `apps/api/src/db/seed.ts`：
  - 插入默认角色（super_admin, principal, teacher, finance）
  - 插入默认校区、默认学期、基础字典

#### Phase 2：逐模块替换 Repository（按依赖顺序）

- [x] `BE-05` 替换 `auth` module — session 存 DB 或 Redis
  - 已将 `auth_sessions` 纳入 Drizzle config 与正式 migration，auth session 的 DB 持久化不再停留在“代码有 schema、数据库无表”的半接真状态；未配置 DB 时 file adapter 仍保留作本地/测试 fallback。
- [x] `BE-06` 替换 `users` module — users/roles 从 JSON → DB
  - 已修复 DB 路径的真实缺口：`user_roles` 允许无 `campusId` 角色绑定、权限 seed id 与 repository fallback 对齐、用户列表关键字匹配补齐 `username`，并补上 `campusId` 存在性校验。
  - 2026-03-25 续跑补丁：将 `user_roles_user_role_campus_uq` 改为 `UNIQUE NULLS NOT DISTINCT`，避免 Postgres 把 system-level 角色绑定里的 `NULL campusId` 视为可重复值。
- [x] `BE-07` 替换 `settings` module — campuses/terms/dictionaries → DB
  - 已让 DB seed 与 settings/users 默认基线对齐：校区、学期、字典、默认用户的 campus 绑定不再与 file 默认数据分叉；未配置 DB 时 file adapter 仍保留作 fallback。
- [x] `BE-08` 替换 `students` module — students/enrollments → DB
  - 已补齐 DB enrollment 写路径校验（campus / term / teacher 存在性与 term-campus 归属），并修正 student 360 作业汇总对 `reviewed` / `published` 状态的统计。
- [x] `BE-09` 替换 `families` module — families/guardians → DB
  - 已完成家庭、监护人、家庭任务的 DB 读写路径，并补齐与 file adapter 一致的结果顺序语义，primary guardian 约束保持生效。
- [x] `BE-10` 替换 `teachers` module — teachers/assignments → DB
  - 已完成 teachers / assignments / development records 的 DB 路径，补上教师创建时的 campus 存在性校验，并统一 assignments / development records 的返回顺序语义。
  - 本轮定向验证已执行：`foundation.test.ts`、`api-gap.test.ts`、`students.test.ts`、`db-seed.test.ts`、`db-migrations.test.ts` 以及 `npm run typecheck --workspace @growthpilot/api`；未在本轮额外启动真实 PostgreSQL 实库联调。
- [x] `BE-11` 替换 `files` module — file_assets → DB, adapter 保留
- [x] `BE-12` 替换 `homework` module — submissions/analyses/reviews → DB
  - 已补齐 DB 路径下的 review draft / outbox event 持久化，去掉此前“用正式 review 表伪装 draft”的实现。
  - 已修复 error taxonomy 在 DB 模式下的状态持久化（`draft` / `active` / `inactive`）与列表兼容性。
- [x] `BE-13` 替换 `growth` module — rubrics/observations/goals/reports → DB
  - 已补齐 growth observations 的 `scores` DB 持久化，避免 DB 模式丢失 rubric 维度评分明细。
  - rubrics / observations / goals / reports 的 DB adapter 已覆盖当前服务层实际读写字段，file adapter 兼容保留。
- [x] `BE-14` 替换 `billing` module — products/contracts/invoices/payments/refunds → DB
- [x] `BE-15` 替换 `attendance` module → DB
- [x] `BE-16` 替换 `communication` module → DB
- [x] `BE-17` 替换 `analytics` module — 改为真实 SQL 聚合查询
  - 当 `GP_PERSISTENCE_ADAPTER=db` 且存在 `DATABASE_URL` 时，`overview` / `teaching` / `billing` 改走 DB scoped SQL 聚合路径；file 模式仍保留原 repository 聚合实现。

#### Phase 3：补缺失接口

- [x] `BE-18` 实现 `POST /students/import`（CSV/JSON 解析 + job 返回）
  - 已支持 inline CSV/JSON 解析并复用 `JobsService` 返回 enqueue-compatible job payload；仅传 `fileId`/无内容时会返回 queued job，便于后续接 file asset 拉取。
- [x] `BE-19` 实现 `POST /families/{familyId}/tasks`
  - 已补齐 file/db repository 写路径，家庭详情返回真实 `tasks`。
- [x] `BE-20` 实现 `POST /teachers/{teacherId}/development-records`
  - 已补齐 file/db repository 写路径，教师详情返回真实 `developmentRecords`。
- [x] `BE-21` 实现 `POST /users`（admin 创建用户）
  - 已支持 admin 创建用户并可一次性绑定 `roleIds` / `campusIds`。
- [x] `BE-22` 统一 rubric 参数命名为 `templateId`
  - 已在 backend controller/service/repository、OpenAPI 与 API QA contract 中统一为 `templateId`。

#### Phase 4：基础设施升级

- [/] `BE-23` 接入 Redis（session cache / rate limit）
  - 已接入 `RedisKvService`、auth session cache、login/refresh rate limit，并在 refresh rotation / logout 时同步驱逐缓存；未配置 `REDIS_URL` 或未安装 `ioredis` 时自动回退内存实现。
  - 2026-03-25：已通过 API typecheck/test/build；当前 sandbox 无可用 Redis，且无法在此环境补齐 lockfile/实际安装 `ioredis`，真实 Redis 连通性待外部环境复验。
- [/] `BE-24` 接入 BullMQ worker（homework AI analyze job / growth report draft job）
  - 已新增 `BullmqJobBroker`、queue constants/types、独立 `worker.ts` / `WorkerModule`，homework analysis 与 growth report draft 在 `JOB_QUEUE_DRIVER=bullmq` 时走队列，默认保留 inline fallback。
  - 2026-03-25：已验证 inline 模式下 worker 可独立启动；当前 sandbox 无 Redis，且未能在本地实际安装 `bullmq` / `ioredis`，故 live BullMQ worker 消费保持 `[/]`。
- [/] `BE-25` files adapter 接入 MinIO/S3 SDK
  - 已新增 `S3ObjectStorageAdapter`，支持 `OBJECT_STORAGE_DRIVER=s3`、MinIO path-style 配置、signed/public URL 解析，并让 files service/controller 全链路支持异步 URL 生成。
  - 2026-03-25：已补 env/config surface 与单测覆盖；当前 sandbox 无 MinIO/S3，且未能在本地实际安装 AWS SDK 依赖，真实对象写入验收待外部环境补跑。

**验收（Phase 1+2 最低要求）**：
- `docker compose up -d` 后数据库可连接
- `npm run dev:api` 启动后 auth/students/homework 链路可跑通
- 不再依赖 `.data/*.json` 文件

**验收（Phase 3+4 完整要求）**：
- 5 个缺失接口均已实现
- homework AI job 走真实 worker queue
- 文件上传写入 MinIO

---

### Agent FRONTEND — 前端去 mock 接真

**目标**：把 31 个静态骨架页变成能真实交互的页面。

**允许编辑**：`apps/web/src/`、`packages/ui/src/`

#### Phase 1：核心流程（P0，先做）

- [x] `FE-01` **登录页真化**：
  - 表单提交调用 `POST /auth/login`
  - 成功后存 token（cookie 或 localStorage）
  - 失败显示错误信息
  - 成功跳转 `/dashboard`
  - 拦截未登录访问跳转 `/login`

- [x] `FE-02` **AppShell 接真**：
  - 顶栏调用 `GET /auth/me` 获取当前用户
  - 侧边菜单根据 `permissions` 做权限裁剪
  - 退出按钮调用 `POST /auth/logout`

- [x] `FE-03` **API Client 统一层**：
  - `lib/api-client.ts` 添加 token 自动附加
  - 添加 401 自动 refresh 或跳转 login
  - 添加统一错误处理

- [x] `FE-04` **Dashboard 接真**：
  - 调用 `GET /analytics/overview`
  - MetricGrid 显示真实数据
  - 移除 `dashboard-service` mock

- [x] `FE-05` **Students 列表接真**：
  - [x] 调用 `GET /students` 带筛选参数
  - [x] 表格分页、排序、搜索联动（已用 URL search params 驱动真实查询与翻页）
  - [x] 行内链接跳转 `/students/[id]`

- [x] `FE-06` **Students 360 接真**：
  - [x] 调用 `GET /students/{id}/360`
  - [x] 展示各模块摘要卡片

- [x] `FE-07` **Teachers 列表/详情接真**：
  - [x] 列表调用 `GET /teachers`
  - [x] 详情调用 `GET /teachers/{id}`

- [x] `FE-08` **Families 列表/详情接真**：
  - [x] 列表调用 `GET /families`
  - [x] 详情调用 `GET /families/{id}`

- [/] `FE-09` **Settings 页面接真**：
  - [x] users 调用 `GET /users`
  - [x] system 调用 `GET /settings/campuses`、`GET /settings/terms`、`GET /settings/dictionaries`
  - [/] AI 任务中心已接 `GET /jobs`；角色列表 / 权限点仍缺后端独立接口，页面改为真实数据 + 基于当前登录态保留缺口说明

- [x] `FE-10` **统一四态组件**：
  - `LoadingState` — 骨架屏/spinner
  - `EmptyState` — 无数据提示 + 操作引导
  - `ErrorState` — 错误信息 + 重试按钮
  - `ForbiddenState` — 无权限提示

#### Phase 2：业务页面接真（P1）

- [x] `FE-11` Homework submissions 列表接真 `GET /homework/submissions`
- [/] `FE-12` Homework review 工作台接真 `GET /homework/submissions/{id}` + `PUT review-draft` + `POST review`
  - 已接真实 detail / review-draft / review submit；上一条/下一条导航与附件 file 元数据入口已补上，但 files 当前仅返回 `local-s3://` / `mock-s3://` 非 HTTP 地址，浏览器二进制预览/下载仍受后端 storage adapter 限制。
- [x] `FE-13` Growth rubrics/observations/goals/reports 各页面接真
  - rubrics/observations/goals/reports 列表与关键 detail 已接真实 API；本轮补上 rubric 模板真实创建 + 详情切换，以及 goals create/check-in、reports generate/review/publish、observations template-aware create 的真实提交入口。
- [/] `FE-14` Billing products/contracts/invoices/renewals 各页面接真
  - 已接 `billing/products`、`billing/contracts`、`billing/contracts/{id}`、`billing/invoices`、`billing/renewals` 真接口；payments/refunds/adjustments 列表仍受后端接口缺口限制，页面明确显示缺口而不伪造数据。
- [/] `FE-15` Attendance board/devices/homework-time 各页面接真
  - 已接 `attendance/events`、`attendance/devices`、`attendance/devices/bindings`、`attendance/homework-time/daily-stats` 真接口；本轮移除了前端硬编码 student/campus 映射，并为 `/attendance/*` 页面补了 SSR 降级，未签到名单 roster、异常修正 workflow、专用趋势序列仍待后端补齐。
- [/] `FE-16` Communication records/messages 各页面接真
  - 已接 `communication/records`、`communication/records/{id}`、`communication/templates`、`communication/message-tasks` 真接口；本轮移除了 family/student 硬编码名称映射，改为通过现有 families/students 真接口补全展示名；meeting/task 反查聚合与真实渠道发送 adapter 仍待后端。
- [x] `FE-17` Analytics overview/teaching/billing 各页面接真图表
  - 已接 `analytics/overview`、`analytics/teaching`、`analytics/billing` 真聚合数据；本轮补了共享条形图组件并把 overview/teaching/billing 三页切到真实图表渲染，同时保留 SSR 友好降级与导出占位。

#### Phase 3：表单交互（P1）

- [x] `FE-18` 新建学生表单 → `POST /students`
  - 学生列表页已新增真实创建表单，提交后回跳列表并展示成功/错误状态。
- [x] `FE-19` 作业上传表单 → `POST /files/upload/multipart` + `POST /homework/submissions`
  - 作业队列页已串起文件 multipart 上传 + submission 创建，使用真实 fileId 落库。
- [x] `FE-20` 复核提交 → `POST /homework/submissions/{id}/review`
  - 复核工作台正式提交已接真；另补了列表页“快速复核”表单，走同一真实接口。
- [x] `FE-21` 成长观察创建 → `POST /growth/observations`
  - 观察页已接真实创建表单，并支持按所选 rubric 模板动态切换评分维度后再提交。
- [x] `FE-22` 合同创建 → `POST /billing/contracts`
  - 合同页已接真实创建表单，现支持一次提交最多 3 条收费项并使用真实 productId 对接后端 `items[]`。
- [x] `FE-23` 收款记录 → `POST /billing/invoices/{id}/payments`
  - 账单页已接真实收款表单并透传 idempotency key；前端已按后端返回的 `paymentId/status/replayed` 正确处理成功态。

#### Phase 4：清理

- [x] `FE-24` 删除所有页面中"骨架/占位/后续接接口/P01/P10"等描述文案
  - 已清理 analytics / attendance / billing / communication / growth / settings 等 shipped 页面中的任务编号、占位说明与常驻状态演示块；保留的缺口文案仅用于诚实说明未开放的后端能力。
- [x] `FE-25` 删除所有 mock service 文件（如可安全移除）
  - 已删除遗留 `dashboard-service` 薄包装；attendance / communication 中剩余“mock-ish”硬编码展示名已改为走现有 students / families / settings 真接口，其他 service 文件保留为真实 API adapter。
- [x] `FE-26` packages/ui 导出实际共用组件（PageHeader/DataTable/FilterBar 等）
  - 已在 `packages/ui` 导出 `PageHeader`、`MetricGrid`、`FilterBar`、`DataTable`、`TabStrip`、`SummaryPanel`、`TimelinePanel`，并让 web 侧开始复用。

**验收（Phase 1 最低要求）**：
- 登录 → Dashboard → 学生列表 → 学生 360 可完整操作
- 至少 10 个页面使用真实 API 数据
- 页面文案无"骨架"字样

**验收（全部完成）**：
- 27 个骨架页 → 全部接真
- 所有列表页支持筛选+分页
- 所有表单可提交

---

## Wave 2：收口与验收

### Agent QA — 测试 + 迁移 + 发布

**目标**：确保核心链路端到端可跑通，数据可迁移，可进入预发。

**允许编辑**：`apps/api/test/`、`apps/web/e2e/`（新建）、`scripts/`、`docs/growthpilot/`

#### E2E 主流程测试

- [x] `QA-01` **学生建档链**：login → 新建家庭 → 新建监护人 → 新建学生 → 在读档 → 分配教师 → 查看 360
- [x] `QA-02` **作业复核链**：上传作业 → 触发 AI 分析 → 查看 AI 结果 → 教师复核 → 提交 → 状态变更
- [x] `QA-03` **成长目标链**：创建 rubric → 新增观察 → 创建目标 → 跟进 check-in → 生成报告草稿
- [x] `QA-04` **账单收款链**：创建产品 → 签订合同 → 生成账单 → 记录收款 → 退款 → 状态自动流转
- [x] `QA-05` **设备签到链**：注册设备 → 绑定学生 → 签到事件 → 学习时长 → 日统计

#### API 合约验证

- [/] `QA-06` 对照 OpenAPI 逐条验证所有接口：请求格式、响应格式、状态码、错误码
  - 2026-03-25：已复跑 `npm run test --workspace @growthpilot/api`（31/31 PASS）；`openapi-contract.test.ts` 会从 Nest controller metadata 自动枚举已实现路由，并逐条断言 `docs/growthpilot/07_OpenAPI.yaml` 覆盖全部 89+ operations；同时保留 auth / settings / users / teachers / students / families / files / homework / growth / attendance / billing / communication / analytics / jobs 的代表性 happy-path 与 error semantics smoke。
  - 仍未做到“所有接口逐条 HTTP 级别矩阵”，因此保持 `[/]` 而不标全绿。
- [x] `QA-07` auth 接口安全验证：过期 token、无效 token、权限不足
- [x] `QA-08` 分页接口统一验证：pageNo/pageSize/total 格式一致

#### 数据迁移验证

- [/] `QA-09` 更新 `scripts/migration/run-staging-import.mjs` 对接真实 DB
  - 2026-03-25：脚本已补齐 post-apply artifact 回写，`summary.json` 现在会带上 `dbPlan.execution`；同时新增 `fixtures/pg-client-stateful.mjs`，`node --test scripts/migration/run-staging-import.test.mjs` 已验证 begin / upsert / commit、重复 `--db-apply` 的 staging upsert 幂等性，以及注入失败后的 rollback。
  - 同日已执行本地 runnable apply：`BATCH-QA-STATEFUL-SAMPLE` / `BATCH-QA-STATEFUL-INVALID` artifact 与持久化 state 见 `docs/growthpilot/artifacts/2026-03-25/stateful-local/`；但当前 sandbox 仍无可用 live PostgreSQL / `DATABASE_URL`，因此保持 `[/]`。
- [x] `QA-10` 用 `fixtures/staging-import-sample.csv` 执行首批导入
  - 2026-03-25：已执行 `fixtures/staging-import-sample.csv` dry-run，批次 `BATCH-QA-DOC` 产出 sample artifact，`3/3` rows ready-to-load。
- [x] `QA-11` 验证导入数据：字段映射正确、幂等性、reject report 生成
  - 2026-03-25：`node --test scripts/migration/run-staging-import.test.mjs` 已覆盖 sample batch 的字段映射持久化校验（`familyStructure=single_parent`、`subject=math`、`errorTaxonomyCode=NO_ERROR`、`payableAmountCents=120000`）、重复 `--db-apply` 后 staging 表仍保持 `1 batch / 3 raw / 3 normalized / 0 rejects`，以及 invalid batch 产出 `7` 条 reject rows 与 `reject-report.csv`。
  - 同日 fresh local artifact 已落到 `docs/growthpilot/artifacts/2026-03-25/stateful-local/`，包含 `BATCH-QA-STATEFUL-SAMPLE`、`BATCH-QA-STATEFUL-INVALID` 与持久化 state snapshot；live PostgreSQL apply 仍由 `QA-09` 单独跟踪。

#### 页面验证

- [/] `QA-12` 所有 31 个页面 SSR 渲染成功（无 500 错误）
  - 2026-03-25：已复跑 `npm run test --workspace @growthpilot/web` 与 `node scripts/qa/run-ssr-smoke.mjs --list-routes-only --assert-route-count 31 --report-file docs/growthpilot/artifacts/2026-03-25/ssr-route-inventory.json`，route inventory 稳定列出 31 个页面。
  - 同日执行 `node scripts/qa/run-ssr-smoke.mjs --routes /dashboard --fail-fast` 时，api/web build 均通过，但 runtime 访问 `127.0.0.1:3101` 仍命中 `connect EPERM`；无法在本 sandbox 确认页面级 non-500 结果，因此保持 `[/]`。
- [/] `QA-13` 权限验证：teacher 角色不能访问 billing 页面
  - 2026-03-25：已复跑 `npm run test --workspace @growthpilot/api`（API 级 teacher vs billing 权限边界 PASS）与 `npm run test --workspace @growthpilot/web`（teacher 导航面不暴露 `/billing*` 与 `/analytics/billing` PASS）。
  - 同日执行 `node scripts/qa/run-billing-permission-smoke.mjs --routes /billing/contracts --fail-fast --skip-build` 仍在 runtime 连接 `127.0.0.1:3101` 前被 sandbox 的 `connect EPERM` 阻断，页面级 forbidden smoke 无法在此环境闭环，因此保持 `[/]`。
- [/] `QA-14` 响应式检查：主要页面在 1280/1440/1920 宽度下无溢出
  - 2026-03-25：已复跑 `npm run test --workspace @growthpilot/web` 与 `node scripts/qa/run-responsive-audit.mjs --assert-route-count 31 --viewport-widths 1280,1440,1920 --report-file docs/growthpilot/artifacts/2026-03-25/responsive-static-audit.json`，31 个页面的 1280 / 1440 / 1920 静态 responsive audit 仍为 `static-pass`，未发现超过 1280px 的固定宽度声明。
  - 浏览器级 overflow / clipping 仍需在允许 localhost runtime 的环境中补跑，因此保持 `[/]`。

#### 发布准备

- [x] `QA-15` 编写预发上线清单（包含 DB migration、seed、env 配置、健康检查）
- [x] `QA-16` 编写回滚方案（DB rollback、代码回退、数据恢复）
- [x] `QA-17` 输出验收报告：通过率、已知问题、推荐发布/不发布决定

**验收**：
- 5 条 E2E 主流程全部 PASS
- API 合约验证通过率 ≥ 95%
- 首批数据导入成功且校验通过
- 预发上线清单和回滚方案就绪

---

## Wave 3：生产加固（QA 验收通过后开始）

### Agent BACKEND — 安全与性能加固

**目标**：把开发可用的后端加固为生产级后端。

#### 安全加固

- [x] `BE-30` **CORS 配置**：
  - 在 `main.ts` 配置 `app.enableCors()` 
  - 只允许生产域名 + localhost（dev）
  - 配置 `credentials: true`
  - 2026-03-25：已在 `main.ts` 启用 CORS，支持 `CORS_ORIGINS` 显式白名单；非生产环境额外放行 localhost/127.0.0.1 常见端口，并开启 `credentials: true`。

- [x] `BE-31` **Helmet 安全头**：
  - 安装 `@nestjs/common` 内置 `helmet` 或 `helmet` 包
  - 配置 CSP、X-Frame-Options、X-Content-Type-Options 等
  - 2026-03-25：已通过自定义安全头中间件落地等效能力，统一下发 CSP / `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` / `HSTS(https+prod)` 等头。

- [x] `BE-32` **Rate Limiting**：
  - 安装 `@nestjs/throttler`
  - 全局限流：60 req/min
  - 登录接口特殊限流：5 req/min（防暴力破解）
  - 2026-03-25：已接入全局 in-memory rate limit guard，默认 `60 req/min`；`POST /auth/login` 单独收紧到 `5 req/min`，`/auth/refresh` 为 `10 req/min`。

- [x] `BE-33` **输入校验强化**：
  - 确保所有 DTO 使用 `class-validator` 装饰器
  - 全局启用 `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
  - SQL 注入防护确认（Drizzle 参数化查询）
  - 2026-03-25：已为 API DTO 补齐 strict schema，并在 `main.ts` 全局启用严格校验 pipe，等效实现 `whitelist + forbidNonWhitelisted`；Drizzle DB 路径继续使用参数化查询。

- [x] `BE-34` **JWT Secret 生产化**：
  - 不允许使用默认 `growthpilot-dev-secret`
  - 启动时检查 `JWT_SECRET` 环境变量长度 ≥ 32 字符
  - 生产环境强制 HTTPS-only cookie
  - 2026-03-25：启动前强制校验 `JWT_SECRET` 非默认值且长度 ≥ 32；auth 控制器新增 `HttpOnly` cookie 下发与清理，生产环境自动强制 `secure`。

- [/] `BE-35` **密码安全**：
  - 用户密码使用 `bcrypt`（cost factor ≥ 12）存储
  - 禁止明文密码存储和传输
  - 2026-03-25：已彻底去掉明文密码存储与比对，改为 Node.js `scrypt` 哈希（seed/file/db default users 与 create user 全部改为 hash）；本轮补充了 `PasswordService` 与 file 持久化定向测试，确认默认用户与新建用户只落库 hash、接口返回不暴露密码字段。
  - 2026-03-25：当前仓库 lockfile / 已安装依赖均不含 `bcrypt`，且本 sandbox 无法联网补装新包，因此仍未满足 checklist 指定的 `bcrypt(cost>=12)` 字面要求，状态保持 `[/]`。

- [x] `BE-36` **敏感数据脱敏**：
  - API 响应中隐藏密码、token 等敏感字段
  - 日志中不输出密码和完整 token
  - 2026-03-25：新增全局响应脱敏 interceptor，默认隐藏 `password/passwordHash/accessToken/refreshToken/secret` 等字段；仅 auth login/refresh 显式放行 token 响应。会话持久化改存 token 指纹而非原文，日志输出也统一做敏感字段遮罩。

#### 性能优化

- [x] `BE-37` **数据库连接池**：
  - 已在 `src/db/client.ts` 统一收口 `pg.Pool`，避免 repository 各自创建连接池
  - 已配置 connection pool（min: 5, max: 20）
  - 已配置连接超时和空闲回收（`connectionTimeoutMillis` / `idleTimeoutMillis`）

- [x] `BE-38` **分页查询优化**：
  - 已将通用分页 `pageSize` 上限统一收紧为 100，`users` 链路也已接入同一归一化逻辑
  - 已生成并提交 `apps/api/drizzle/0003_married_tinkerer.sql`，将 students/homework/growth 高频分页列表索引正式落库
  - 已补充 migration snapshot / SQL 断言测试，覆盖 students、student_enrollments、homework_submissions、growth_observations、growth_goals、growth_reports、rubric_templates 等关键分页索引
  - 2026-03-25：已定向通过 `npm run test --workspace @growthpilot/api -- test/security.test.ts test/db-migrations.test.ts test/observability.test.ts test/foundation.test.ts test/api-gap.test.ts` 与 `npm run typecheck --workspace @growthpilot/api`

- [x] `BE-39` **文件上传限制**：
  - 已限制单文件上限 20MB
  - 已限制 JSON/urlencoded/multipart 请求 body 上限 50MB
  - 已增加文件类型白名单（image/pdf/doc/docx/xls/xlsx）

- [x] `BE-40` **响应压缩**：
  - 已启用 gzip 响应压缩中间件
  - 当前为内置 middleware 实现，未额外引入 `compression` 包

#### 日志与监控

- [x] `BE-41` **结构化日志**：
  - 已接入全局 JSON 结构化日志输出
  - 已覆盖 request log / exception log，包含 requestId、userId、method、path、status、duration
  - 当前采用自定义结构化 logger，未额外引入 `pino` / `winston`

- [x] `BE-42` **健康检查端点**：
  - 已新增 `GET /health` — 返回 `{ status: "ok", version, uptime }`
  - 已新增 `GET /health/ready` — 检查 DB / Redis / storage readiness（未配置依赖时返回 skipped）

- [x] `BE-43` **错误追踪预留**：
  - 全局异常过滤器已统一为 `{ code, message, requestId, timestamp }`（有 details 时附带 details）
  - 已预留错误追踪 hook，可通过环境变量开关启用后接入 Sentry/Bugsnag 类 sink

**验收**：
- 安全扫描无 critical/high 漏洞
- 压测：50 并发下 P99 < 500ms
- health check 端点可用

---

### Agent INFRA — 容器化与 CI/CD

**目标**：让项目可以一键构建 Docker 镜像、自动化部署到服务器。

#### 容器化

- [x] `INF-10` **API Dockerfile**：
  ```dockerfile
  # apps/api/Dockerfile
  # 多阶段构建：builder(npm ci + build) → runner(node:20-alpine + dist)
  # 暴露端口 3000
  # CMD ["node", "dist/main.js"]
  ```
  - 已创建 `apps/api/Dockerfile`，采用 `deps -> builder -> production-deps -> runner` 多阶段构建。
  - runner 默认 `PORT=3000`，并预建 `apps/api/.data` / `apps/api/.runtime` 目录以承接当前 file-backed 运行时数据。
  - 已在临时目录验证 `npm ci --omit=dev --workspace @growthpilot/api --include-workspace-root=false --dry-run` 可解析。

- [x] `INF-11` **Web Dockerfile**：
  ```dockerfile
  # apps/web/Dockerfile
  # 多阶段构建：deps → builder(next build) → runner(node server.js)
  # 暴露端口 3001
  # 使用 standalone output（通过 NEXT_PRIVATE_STANDALONE=true 生成）
  ```
  - 已创建 `apps/web/Dockerfile`，采用 `deps -> builder -> runner` 多阶段构建。
  - 受限于本轮允许编辑范围，未改 `next.config.ts`；改为在 builder 阶段使用 `NEXT_PRIVATE_STANDALONE=true` 生成 `.next/standalone`，本地已验证可产出 standalone 目录。
  - runner 以 `node server.js` 启动 standalone 服务，默认 `PORT=3001`、`HOSTNAME=0.0.0.0`。

- [x] `INF-12` **docker-compose.prod.yml**：
  ```yaml
  # 包含：api, web, postgres, redis, minio, nginx
  # nginx 反向代理：
  #   / → web:3001
  #   /api → api:3000
  # volumes: api-data, api-runtime, postgres-data, minio-data, redis-data
  # restart: always
  # 环境变量从 .env.prod 读取
  ```
  - 已创建 `docker-compose.prod.yml`，包含 `api`、`web`、`postgres`、`redis`、`minio`、`nginx` 六个服务，均设置 `restart: always`。
  - `nginx` 转发 `/` 到 `web:3001`，转发 `/api/` 到 `api:3000`；`postgres` 在内部网络增加 `db` alias 以兼容 `DATABASE_URL` 示例。
  - 除 `postgres-data` / `redis-data` / `minio-data` 外，额外增加 `api-data` / `api-runtime` volume，保持当前 API 的 `.data` / `.runtime` 持久化。
  - 已使用 `docker compose --env-file .env.prod -f docker-compose.prod.yml config` 做过配置解析校验。

- [x] `INF-13` **Nginx 配置**：
  - 创建 `deploy/nginx/nginx.conf`
  - 反向代理 web 和 api
  - 静态资源缓存策略
  - gzip 压缩
  - SSL/TLS 终结点预留（Let's Encrypt 或云证书）
  - 已创建 `deploy/nginx/nginx.conf`，包含 `api_upstream` / `web_upstream`、`/_next/static/` 缓存、gzip、`/healthz`、ACME challenge 路径与 TLS 注释占位。

- [x] `INF-14` **创建 `.env.prod.example`**：
  ```env
  NODE_ENV=production
  POSTGRES_DB=growthpilot
  POSTGRES_USER=gp
  POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
  DATABASE_URL=postgresql://gp:REPLACE_WITH_STRONG_PASSWORD@db:5432/growthpilot
  REDIS_URL=redis://redis:6379
  JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
  JWT_ACCESS_TTL_SECONDS=900
  JWT_REFRESH_TTL_SECONDS=2592000
  GP_PERSISTENCE_ADAPTER=db
  OBJECT_STORAGE_DRIVER=local
  S3_ENDPOINT=http://minio:9000
  S3_ACCESS_KEY=REPLACE_WITH_MINIO_ACCESS_KEY
  S3_SECRET_KEY=REPLACE_WITH_MINIO_SECRET_KEY
  S3_BUCKET=growthpilot
  CORS_ORIGIN=https://your-domain.com
  API_BASE_URL=https://your-domain.com/api/v1
  NEXT_PUBLIC_API_BASE_URL=/api/v1
  GROWTHPILOT_API_BASE_URL=http://api:3000/api/v1
  ```
  - 已创建 `.env.prod.example`，补齐 PostgreSQL / Redis / JWT / MinIO / Nginx 端口等生产示例变量。
  - 诚实说明当前应用层对象存储仍使用 `OBJECT_STORAGE_DRIVER=local`；`S3_*` / MinIO 变量已预留并在 compose 中提供基础设施，但 API 尚未切换到真实 S3-compatible adapter。

#### CI/CD 流水线

- [x] `INF-15` **更新 `.github/workflows/ci.yml`**：
  - 添加 Docker build 步骤
  - 添加 Docker image push（到 Docker Hub / GHCR / 阿里云 ACR）
  - 添加 tag 触发生产部署
  - 已将 `ci.yml` 扩展为：保留 lint/typecheck/test，新增 API/Web Docker buildx 流程，并在非 PR 事件登录 GHCR 推送镜像。
  - 当前分支未包含 `apps/api/Dockerfile` / `apps/web/Dockerfile`，工作流在文件缺失时会显式 skip，而不是伪装成功构建。
  - 已在 `v*` tag push 时复用 `deploy.yml` 触发 production 部署。

- [x] `INF-16` **创建 `.github/workflows/deploy.yml`**：
  ```yaml
  # 触发条件：push to main / 手动触发
  # 步骤：
  # 1. Build & push Docker images
  # 2. SSH 到服务器
  # 3. docker compose pull
  # 4. docker compose up -d
  # 5. 健康检查
  # 6. 失败回滚
  ```
  - 已新增独立 `deploy.yml`，支持 `push main`、`workflow_dispatch`、以及供 `ci.yml` 复用的 `workflow_call`；生产 tag 发布经由 `ci.yml` 统一调用，避免重复部署。
  - 已采用 environment-scoped secrets（`DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` / `DEPLOY_TARGET_PATH` 等）通过 SSH 到目标机执行仓库内 `deploy/scripts/deploy.sh`。
  - 失败时会触发远程 `rollback.sh --skip-db-restore` 兜底；完整 DB 回滚由 `deploy.sh` 内部在健康检查失败时基于预部署备份自动处理。

- [x] `INF-17` **创建部署脚本 `deploy/scripts/deploy.sh`**：
  ```bash
  # 1. 拉取最新镜像
  # 2. 备份当前数据库
  # 3. 运行 migration
  # 4. 重启服务
  # 5. 健康检查
  # 6. 如果失败 → 回滚数据库 + 回退镜像
  ```
  - 已创建 `deploy/scripts/deploy.sh`，具备 pre-deploy backup、migration、可选 seed、`docker compose up -d --remove-orphans`、健康检查与失败自动回滚链路。
  - 镜像版本通过 `deploy/state/current-release.env` / `previous-release.env` 管理，兼容使用 env substitution 的 compose 配置。
  - 健康检查 URL 默认指向 `/health` 与 `/health/ready`，但因当前允许编辑范围不含 API 健康端点实现，脚本保留 `DEPLOY_HEALTHCHECK_URLS` 可配置入口。

- [x] `INF-18` **创建回滚脚本 `deploy/scripts/rollback.sh`**：
  ```bash
  # 1. 恢复上一个镜像版本
  # 2. 恢复数据库备份
  # 3. 重启服务
  # 4. 健康检查
  ```
  - 已创建 `deploy/scripts/rollback.sh`，会恢复上一个 release env、按需恢复最近一次 `.sql.gz` 备份、重新 `docker compose up -d` 并执行健康检查。
  - 已补充 `deploy/scripts/db-restore.sh` 供回滚脚本复用。

#### 数据库运维

- [x] `INF-19` **数据库 Migration 命令**：
  - `npm run db:migrate` — 执行迁移
  - `npm run db:seed` — 执行种子数据
  - `npm run db:reset` — 清空重建（仅 dev）
  - `npm run db:backup` — pg_dump 备份
  - 已在根 `package.json` 落地 `db:migrate` / `db:seed` / `db:reset` / `db:backup`，并补充 `db:restore` 与 `db:backup:install-cron`。
  - 命令默认支持本地执行，也支持通过 `DB_COMMAND_MODE=compose-run` 在 compose 的 `api` service 中执行 migration/seed。
  - `db:reset` 默认禁止在 `NODE_ENV=production` 下运行，除非显式设置 `ALLOW_DB_RESET=1`。

- [x] `INF-20` **数据库自动备份**：
  - 创建 `deploy/scripts/db-backup.sh`
  - 每日自动备份（cron）
  - 保留最近 30 天备份
  - 备份到独立存储目录
  - 已创建 `deploy/scripts/db-backup.sh`，使用 `pg_dump` 生成 gzip 备份，并按天数清理过期文件。
  - 已新增 `deploy/scripts/install-db-backup-cron.sh` 与 `deploy/cron/db-backup.cron` 模板，默认每天 `03:00` 备份并保留最近 30 天。
  - 默认独立备份目录为 `deploy/backups/postgres/`，日志输出到 `deploy/logs/db-backup.log`。

- [x] `INF-21` **SSL/TLS 证书**：
  - 创建 `deploy/nginx/ssl/` 目录
  - 预留 Let's Encrypt certbot 配置
  - 或创建自签证书脚本用于测试
  - 已创建 `deploy/nginx/ssl/`、`deploy/nginx/ssl/certbot/`、`deploy/nginx/ssl/self-signed/` 目录结构。
  - 已新增 `deploy/nginx/ssl/self-signed/generate-self-signed-cert.sh`，可直接生成测试用 `fullchain.pem` / `privkey.pem`。
  - 已补充 `deploy/nginx/ssl/README.md` 说明 certbot 预留目录与自签证书用法。

**验收**：
- `docker compose -f docker-compose.prod.yml up -d` 一键启动全套服务
- 健康检查 `/health` 和 `/health/ready` 均返回 200
- CI 流水线可自动构建镜像
- 部署脚本可在目标服务器执行

---

## Wave 4：数据迁移 & UAT（生产加固完成后）

### Agent QA — 数据迁移全量验证

**目标**：确保历史 Excel 数据完整、准确地迁入生产数据库。

#### 数据迁移

- [x] `QA-20` **迁移脚本生产化**：
  - 从 staging 脚本升级为可连接生产 DB 的正式脚本
  - 支持 `--dry-run` 模式（只输出变更，不写入）
  - 支持 `--report-only` 模式（只生成校验报告）
  - 已补 `deploy/scripts/run-production-migration.mjs`，统一封装 `dry-run` / `report-only` / `db-apply` 三种发布入口，并在 prod `db-apply` 强制要求 `--confirm-prod`。
  - 已补 `deploy/scripts/release-ops.test.mjs` 覆盖 release migration wrapper、env validator 与 release workspace scaffolding。

- [x] `QA-21` **迁移顺序编排**：
  1. 基础字典（grade_levels, subjects, error_tags, habit_dimensions, fee_items）
  2. 校区、学期
  3. 教师
  4. 家庭 + 监护人
  5. 学生 + 在读档 + 教师分配
  6. 收费方案 + 合同 + 账单 + 收款
  7. 作业提交 + AI 分析 + 教师复核
  8. 习惯观察 + 成长目标
  9. 设备 + 绑定 + 签到 + 学习时长
  - 已在 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md` 固化顺序、退出条件和批次证据要求。

- [x] `QA-22` **数据清洗规则确认**：
  - 字段映射对照表（Excel 列名 → DB 字段）
  - 空值处理规则
  - 日期格式统一
  - 手机号/身份证号脱敏或校验
  - 重复数据去重策略（student_no + 姓名 + 学期）
  - 已在 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md` 补齐字段映射、空值/日期/金额/脱敏/去重规则。

- [/] `QA-23` **全量迁移执行**：
  - 在 staging 环境执行全量迁移
  - 输出 `migration-report.json`（成功数/失败数/跳过数/reject 列表）
  - 人工校验 reject 数据
  - 已补 staging/UAT 执行 runbook、日志模板、rollback checkpoint 与 evidence 目录约定：`docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md`
  - 已新增 `docs/growthpilot/templates/migration_execution_log_template.md`，并让 `npm run ops:release:init` 自动脚手架 `migration-execution-log.md`
  - 尚未在真实 staging/UAT 库执行全量导入，因此不能记完成。

- [/] `QA-24` **迁移数据校验**：
  - 总数核对（Excel 行数 vs DB 记录数）
  - 关键字段抽样（每表抽 10 条核对）
  - 外键完整性检查（学生→家庭→监护人链路）
  - 金额一致性检查（合同金额 = Σ 账单金额）
  - 已补 SQL 校验 runbook、抽样口径、幂等/金额校验流程：`docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md`
  - 已新增 `docs/growthpilot/templates/migration_validation_checklist.md`、`docs/growthpilot/templates/migration_validation_queries.sql`，并让 `npm run ops:release:init` 自动脚手架校验清单与 SQL 模板
  - 尚未对真实 staging/UAT 导入批次执行校验。

#### 用户验收测试（UAT）

- [x] `QA-25` **UAT 测试计划编写**：
  - 按角色分：super_admin / principal / teacher / finance
  - 每个角色 5-8 个核心场景
  - 预期结果明确
  - 已补 `docs/growthpilot/templates/uat_execution_template.yaml` 与 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md`，覆盖 4 角色核心场景与签收字段。

- [/] `QA-26` **UAT 环境搭建**：
  - 部署 staging/UAT 环境
  - 导入迁移后的真实数据
  - 创建 UAT 测试账号
  - 已补 UAT 环境搭建检查项、账号/数据/日志要求，以及基于当前仓库 seed / API 的账号准备流程：`docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md`
  - 已新增 `docs/growthpilot/templates/uat_environment_checklist.md`，并让 `npm run ops:release:init` 自动脚手架 `uat-environment-checklist.md`
  - 未在真实环境完成部署、导数与账号创建，保持进行中。

- [/] `QA-27` **UAT 执行**（需用户参与）：
  - super_admin 场景：用户管理、角色分配、系统设置
  - principal 场景：Dashboard 总览、学生 360、教师排班、分析报表
  - teacher 场景：作业列表、复核工作台、习惯观察、成长目标
  - finance 场景：合同管理、账单开具、收款记录、退费处理
  - 已将 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md` 强化为可执行 UAT 包，补齐 war room 角色职责、时间盒、4 角色逐条执行脚本、证据命名规则与 `pass / conditional-pass / fail` 签收流。
  - 已扩展 `docs/growthpilot/templates/uat_execution_template.yaml`，可直接记录入口条件、账号状态、逐 case 结果、缺陷绑定与多角色签收。
  - 尚未组织真实业务用户在 UAT 环境按脚本执行，因此保持进行中。

- [/] `QA-28` **UAT 问题清单收集与修复**：
  - 记录所有问题（blocker / major / minor）
  - blocker 必须修复后才可上线
  - major 最迟上线后 3 天内修复
  - minor 归入后续迭代
  - 已重写 `docs/growthpilot/templates/defect_triage_template.md`，补齐分级标准、状态流、triage 节奏、修复 SLA、回归关闭模板与放行规则。
  - 已新增 `docs/growthpilot/templates/uat_defect_log_template.md`，可直接登记 UAT 缺陷清单、回归结果与证据路径。
  - 已在 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md` 固化缺陷来源、处理节奏、修复闭环与 blocker 清零要求。
  - 尚未形成真实 UAT 缺陷清单。

- [/] `QA-29` **性能基准测试**：
  - 模拟 50 并发用户
  - 首页加载 < 3s
  - API 列表查询 P95 < 300ms
  - 文件上传 10MB < 5s
  - 已补完整文档包：基准 runbook `docs/growthpilot/43_QA29_QA31_QA32_性能基准与发布后观察运行手册.md`、measurement sheet `docs/growthpilot/templates/performance_benchmark_sheet_template.md`，并回填 `docs/growthpilot/38_Wave4_生产迁移与UAT操作手册.md`。
  - 尚未在真实 UAT 环境执行压测。

**验收**：
- 全量迁移成功，reject 率 < 2%
- UAT blocker 数量 = 0
- 性能达标

---

## Wave 5：正式上线（UAT 通过后）

### Agent INFRA — 生产环境部署

**目标**：完成服务器配置、域名解析、SSL 证书、正式服务启动。

#### 服务器准备

- [/] `INF-30` **服务器环境初始化**：
  - 安装 Docker + Docker Compose
  - 安装 Node.js 20（备用直接运行）
  - 配置防火墙：只开放 80/443/22
  - 创建部署用户（非 root）
  - 配置 SSH key 登录（禁用密码登录）
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 和 `docs/growthpilot/43_Wave5_生产环境矩阵.md` 固化主机基线、初始化命令、目录约定、SSH/防火墙检查项和证据要求；未对真实服务器执行。

- [/] `INF-31` **域名与 DNS**：
  - 域名 A 记录指向服务器 IP
  - 配置 www → 非 www 重定向（或反之）
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 和 `docs/growthpilot/43_Wave5_生产环境矩阵.md` 固化单域名 `/api` 代理策略、DNS 记录矩阵、TTL 切换步骤与 `dig` 验证命令；未修改真实域名。

- [/] `INF-32` **SSL 证书配置**：
  - 安装 certbot / acme.sh
  - 申请 Let's Encrypt 证书
  - 配置自动续期（cron）
  - Nginx 启用 HTTPS + HTTP→HTTPS 重定向
  - 已将首次生产推荐拓扑明确为“主机侧 Nginx/LB 终止 TLS -> Compose 内 Nginx”，补充 `deploy/examples/nginx.growthpilot.edge.conf.example`、`deploy/README.md` 和 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 的证书签发/续期/验收流程；未申请真实证书。

- [/] `INF-33` **生产环境变量配置**：
  - 在服务器创建 `.env.prod`（从 `.env.prod.example` 复制并填写真实值）
  - JWT_SECRET 生成 64 位随机字符串
  - 数据库密码使用强密码
  - S3 密钥配置
  - 已在 `docs/growthpilot/43_Wave5_生产环境矩阵.md` 固化环境变量矩阵、消费者、填写规则和特殊注意事项，并在 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 固化 `.env.prod` 生成/校验步骤；真实 `.env.prod` 尚未生成/校验。

- [/] `INF-34` **日志收集配置**：
  - Docker logs 输出到文件
  - 配置 logrotate（日志轮转，保留 30 天）
  - 或接入日志服务（阿里云 SLS / 自建 Loki）
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md`、`docs/growthpilot/41_运维手册.md` 固化日志源、`tee` 归档方式、`logrotate` 安装和发布日必留字段，并复用 `deploy/examples/growthpilot.logrotate.conf`；真实主机未落配置。

- [/] `INF-35` **监控告警**：
  - 配置 uptime 检查（UptimeRobot / 自建）
  - 监控端点：`/health` + `/health/ready`
  - 磁盘空间告警（> 80%）
  - 数据库连接数告警
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md`、`docs/growthpilot/41_运维手册.md`、`docs/growthpilot/43_Wave5_生产环境矩阵.md` 固化监控面、阈值、SQL/HTTP 检查命令、值班分工，并补充 `docs/growthpilot/templates/go_live_observation_log_template.md`
  - 尚未接入真实监控系统。

#### 上线执行

- [/] `INF-36` **生产数据库初始化**：
  ```bash
  # 1. 创建数据库
  docker compose -f docker-compose.prod.yml exec db createdb -U gp growthpilot
  # 2. 执行 migration
  npm run db:migrate
  # 3. 执行 seed
  npm run db:seed
  ```
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 固化执行前置条件、`DEPLOY_ENV_FILE=.env.prod` 用法、备份/恢复命令、验证步骤与 rollback checkpoint
  - 已新增 `docs/growthpilot/templates/prod_db_init_checklist.md`，并让 `npm run ops:release:init` 自动脚手架 `prod-db-init-checklist.md`
  - 未触达真实生产库，保持进行中。

- [/] `INF-37` **生产数据迁移**：
  - 执行全量 Excel 数据导入
  - 启用 `--report-only` 先做 dry-run
  - 确认后执行正式导入
  - 保存迁移报告
  - 已补正式环境命令模板、source hash/备份/校验/rollback 证据链，以及 `--confirm-prod` 守门逻辑：`docs/growthpilot/39_Wave5_正式上线操作手册.md`
  - 已将 `migration-execution-log.md` / `migration-validation-checklist.md` / `sql/migration-validation.sql` 纳入 release workspace 脚手架
  - 当前仓库内正式迁移脚本仍只写 `qa_staging.*`，尚未执行真实生产迁移，因此保持进行中。

- [/] `INF-38` **首次部署**：
  ```bash
  # 1. 拉取代码或推送镜像
  # 2. docker compose -f docker-compose.prod.yml up -d
  # 3. 等待所有服务健康
  # 4. 访问域名验证
  ```
  - 已在 `docs/growthpilot/39_Wave5_正式上线操作手册.md` 和 `deploy/README.md` 固化 clean host 首次部署顺序：代码检出、`.env.prod` 校验、DB 状态确认与必要备份、底座启动、`db:migrate`/按需 `db:seed`、`docker compose ... up -d --build api web nginx`、健康检查与失败即停条件；未执行真实部署。

- [/] `INF-39` **上线冒烟验证**：
  - 访问首页可加载
  - 登录流程可完成
  - 学生列表可显示迁移数据
  - 作业上传可正常工作
  - 文件下载可正常工作
  - 已新增 `docs/growthpilot/templates/go_live_smoke_checklist_template.md`，并在 `docs/growthpilot/40_发布观察窗口与验收模板.md`、`docs/growthpilot/templates/go_live_observation_log_template.md` 中串起 T+0/T+24h/T+72h 观察流程；未在真实生产环境执行。

### Agent QA — 上线验收

- [x] `QA-30` **Go/No-Go 检查清单**：
  | 检查项 | 状态 |
  |---|---|
  | SSL 证书有效且自动续期 | [ ] |
  | 数据库备份脚本已配置并执行过 | [ ] |
  | 回滚脚本已测试 | [ ] |
  | 生产数据迁移完成且校验通过 | [ ] |
  | 5 条 E2E 主流程在生产环境通过 | [ ] |
  | 性能指标达标 | [ ] |
  | UAT blocker 全部关闭 | [ ] |
  | 团队知晓回滚流程 | [ ] |
  | 监控告警已配置 | [ ] |
  - 已补 `docs/growthpilot/templates/qa_release_gate_template.yaml`、`docs/growthpilot/39_Wave5_正式上线操作手册.md` 与 `docs/growthpilot/40_发布观察窗口与验收模板.md`，可直接用于 Go/No-Go 会议。

- [/] `QA-31` **上线后 24h 监控**：
  - 持续观察错误日志
  - 监控 API 响应时间
  - 监控数据库连接数和慢查询
  - 监控磁盘和内存使用
  - 已补 24h 观察 playbook、采样频率、阈值表、incident escalation tree 与证据模板：`docs/growthpilot/43_QA29_QA31_QA32_性能基准与发布后观察运行手册.md`、`docs/growthpilot/templates/go_live_observation_log_template.md`、`docs/growthpilot/templates/incident_evidence_template.md`。
  - 真实 24h 观察尚未发生。

- [/] `QA-32` **上线后 72h 稳定性确认**：
  - 无 P0/P1 级别 bug
  - 数据库备份正常执行
  - 用户反馈收集
  - 已补 72h 稳定性通过标准、趋势回看要求与收尾模板：`docs/growthpilot/43_QA29_QA31_QA32_性能基准与发布后观察运行手册.md`、`docs/growthpilot/templates/go_live_observation_log_template.md`、`docs/growthpilot/templates/release_acceptance_report_template.md`。
  - 真实稳定性观察尚未发生。

- [/] `QA-33` **发布验收报告**：
  - 版本号、发布时间、发布人
  - 包含功能列表
  - 已知限制
  - 后续迭代计划
  - 已增强 `docs/growthpilot/templates/release_acceptance_report_template.md`，补齐入口条件、执行摘要、时间线、UAT/缺陷摘要、观察窗口指标、最终结论与签收字段。
  - 已在 `docs/growthpilot/40_发布观察窗口与验收模板.md` 明确报告填报顺序及证据来源。
  - 真实发布验收报告仍需待正式上线并完成 T+24h / T+72h 观察后填充。

#### 运维文档

- [x] `QA-34` **运维手册编写**：
  - 服务器架构图
  - 服务启停命令
  - 日志查看方法
  - 常见问题排查
  - 数据库备份恢复流程
  - 紧急联系人
  - 已新增 `docs/growthpilot/41_运维手册.md`。

- [/] `QA-35` **用户操作手册**（简版）：
  - 各角色首次登录指引
  - 核心操作流程截图
  - FAQ
  - 已重写 `docs/growthpilot/42_用户操作手册_简版.md`，补齐通用导航、4 角色快速上手、6 条核心操作流程、异常判断、FAQ 与截图补拍清单，已可直接发给业务用户预习或现场带跑。
  - 真实环境截图尚未补拍，且未经过真实用户确认最终文案，因此暂不标完成。

**验收**：
- 生产环境稳定运行 72h 无 P0 故障
- 运维手册和用户手册就绪
- 验收报告签发

---

## 并行执行矩阵（完整版）

```
时间线    Day 1-2       Day 3-9            Day 10-14       Day 15-18          Day 19-21       Day 22-23
         ┌──────────┐  ┌────────────────┐  ┌────────────┐  ┌───────────────┐  ┌─────────────┐ ┌──────────┐
INFRA    │INF-01~08 │  │                │  │            │  │ INF-10~21     │  │ INF-30~39   │ │          │
         └──────────┘  │                │  │            │  │ 容器化+CI/CD  │  │ 服务器部署  │ │          │
SPEC     │SPEC-01~05│  │                │  │            │  │               │  │             │ │          │
         └──────────┘  │                │  │            │  │               │  │             │ │          │
BACKEND  │  blocked  │  │ BE-01 ~ BE-25 │  │  support   │  │ BE-30~43      │  │   support   │ │          │
         │           │  │               │  │            │  │ 安全+性能     │  │             │ │          │
FRONTEND │  blocked  │  │ FE-01 ~ FE-26 │  │  support   │  │               │  │             │ │          │
         └──────────┘  │               │  │            │  │               │  │             │ │          │
QA       │  blocked  │  │    blocked    │  │QA-01 ~ 17  │  │ QA-20~29      │  │ QA-30~35    │ │ 上线监控 │
         │           │  │              │  │ 测试验收   │  │ 迁移+UAT      │  │ 上线验收    │ │          │
         └──────────┘  └────────────────┘  └────────────┘  └───────────────┘  └─────────────┘ └──────────┘
         ← Wave 0 →    ←    Wave 1    →   ←  Wave 2  →    ←   Wave 3    →   ←  Wave 4+5  →
```

---

## 任务统计

| Wave | Agent | 任务数 | 预计天数 |
|---|---|---:|---:|
| Wave 0 | INFRA | 8 | 1-2 |
| Wave 0 | SPEC | 5 | 1-2 |
| Wave 1 | BACKEND | 25 | 5-7 |
| Wave 1 | FRONTEND | 26 | 5-7 |
| Wave 2 | QA | 17 | 3-5 |
| Wave 3 | BACKEND (安全) | 14 | 3-4 |
| Wave 3 | INFRA (容器化) | 12 | 3-4 |
| Wave 4 | QA (迁移+UAT) | 10 | 3-4 |
| Wave 5 | INFRA (上线) | 10 | 2-3 |
| Wave 5 | QA (验收) | 6 | 2-3 |
| **合计** | **5 Agent** | **133** | **~23 天** |

---

## 快速启动指南（给 Agent 的第一条指令）

### 启动 Agent INFRA（Wave 0）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 0 → Agent INFRA" 部分，
从 INF-01 开始按顺序执行所有任务。完成每项后在文件中标记 [x]。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent SPEC（Wave 0）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 0 → Agent SPEC" 部分，
从 SPEC-01 开始按顺序执行。设计文档源在 /Users/Ljc_1/Downloads/hongji_vibe_docs/。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent BACKEND（Wave 1，Wave 0 完成后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 1 → Agent BACKEND" 部分。
当前后端所有 Repository 使用 FileJsonStore（JSON 文件），你的任务是引入 Drizzle + PostgreSQL 逐模块替换。
从 BE-01 开始按依赖顺序执行。DDL 参考 docs/growthpilot/05_数据库DDL.sql。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent FRONTEND（Wave 1，Wave 0 完成后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 1 → Agent FRONTEND" 部分。
当前前端有 31 个页面但大部分是静态骨架，不调用真实 API。
从 FE-01 开始按顺序接入真实 API。保持现有 vanilla CSS，不引入 Tailwind/shadcn。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent QA（Wave 2，Wave 1 基本完成后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 2 → Agent QA" 部分。
从 QA-01 开始编写并执行 E2E 测试。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent BACKEND 安全加固（Wave 3，Wave 2 验收后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 3 → Agent BACKEND 安全与性能加固" 部分。
从 BE-30 开始按顺序执行安全加固、性能优化和日志监控任务。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent INFRA 容器化（Wave 3，Wave 2 验收后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 3 → Agent INFRA 容器化与 CI/CD" 部分。
从 INF-10 开始，创建 Dockerfile、docker-compose.prod.yml、CI/CD 流水线和部署脚本。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent QA 迁移与 UAT（Wave 4，Wave 3 完成后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 4 → Agent QA 数据迁移全量验证" 部分。
从 QA-20 开始，编写生产级迁移脚本、数据校验和 UAT 测试计划。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```

### 启动 Agent INFRA 上线部署（Wave 5，UAT 通过后）
```
请阅读 docs/growthpilot/35_merged_agent_execution_todos.md 中 "Wave 5 → Agent INFRA 生产环境部署" 部分。
从 INF-30 开始，配置服务器、域名、SSL、生产环境变量，执行首次部署。
当前仓库位于 /Users/Ljc_1/Downloads/growth-pilot/。
```
