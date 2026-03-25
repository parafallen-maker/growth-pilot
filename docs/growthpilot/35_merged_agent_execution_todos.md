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

- [/] `BE-05` 替换 `auth` module — session 存 DB 或 Redis
  - 已新增 `auth_sessions` Drizzle schema、auth session repository 抽象与 file/db selectable adapter；默认仍走 file，设置 `GP_PERSISTENCE_ADAPTER=db` 且提供 `DATABASE_URL` 后可切到 DB。
- [/] `BE-06` 替换 `users` module — users/roles 从 JSON → DB
  - 已将 users/roles/permissions 改造成 repository adapter 结构，并提供 Drizzle DB 实现与 seed 基线；当前为了兼容现有同步链路与测试，默认 adapter 仍为 file。
- [/] `BE-07` 替换 `settings` module — campuses/terms/dictionaries → DB
  - 已将 campuses/terms/dictionaries 改造成 repository adapter 结构，并提供 Drizzle DB 实现与 seed 基线；默认 adapter 仍为 file，待后续联通 migration/真实数据库验收后切默认值。
- [/] `BE-08` 替换 `students` module — students/enrollments → DB
  - 已将 students/enrollments 改造成 selectable file/db repository adapter；默认仍为 file，设置 `GP_PERSISTENCE_ADAPTER=db` 且提供 `DATABASE_URL` 后走 Drizzle PostgreSQL 实现。
- [/] `BE-09` 替换 `families` module — families/guardians → DB
  - 已将 families/guardians 改造成 selectable file/db repository adapter；默认仍为 file，DB 实现已覆盖家庭/监护人读写与 primary guardian 约束。
- [/] `BE-10` 替换 `teachers` module — teachers/assignments → DB
  - 已将 teachers 改造成 selectable file/db repository adapter，并补上 teacher assignments 的 DB 查询路径；默认仍为 file，development records 写路径待后续 BE-20 一并接真。
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

- [ ] `BE-23` 接入 Redis（session cache / rate limit）
- [ ] `BE-24` 接入 BullMQ worker（homework AI analyze job / growth report draft job）
- [ ] `BE-25` files adapter 接入 MinIO/S3 SDK

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
  - [/] 角色列表 / 权限点 / AI 任务中心仍缺后端独立接口，页面改为真实数据 + 明确缺口说明

- [x] `FE-10` **统一四态组件**：
  - `LoadingState` — 骨架屏/spinner
  - `EmptyState` — 无数据提示 + 操作引导
  - `ErrorState` — 错误信息 + 重试按钮
  - `ForbiddenState` — 无权限提示

#### Phase 2：业务页面接真（P1）

- [x] `FE-11` Homework submissions 列表接真 `GET /homework/submissions`
- [/] `FE-12` Homework review 工作台接真 `GET /homework/submissions/{id}` + `PUT review-draft` + `POST review`
  - 已接真实 detail / review-draft / review submit；上一条/下一条导航与附件 file 元数据入口已补上，但真正二进制预览/下载仍待 files 能力继续补齐。
- [/] `FE-13` Growth rubrics/observations/goals/reports 各页面接真
  - rubrics/observations/goals/reports 列表与关键 detail 已接真实 API；本轮新增 goals create/check-in 与 reports generate/review/publish 真实提交入口，rubric 编辑仍待后端/前端进一步完善。
- [/] `FE-14` Billing products/contracts/invoices/renewals 各页面接真
  - 已接 `billing/products`、`billing/contracts`、`billing/contracts/{id}`、`billing/invoices`、`billing/renewals` 真接口；payments/refunds/adjustments 列表仍受后端接口缺口限制，页面明确显示缺口而不伪造数据。
- [/] `FE-15` Attendance board/devices/homework-time 各页面接真
  - 已接 `attendance/events`、`attendance/devices`、`attendance/devices/bindings`、`attendance/homework-time/daily-stats` 真接口；本轮移除了前端硬编码 student/campus 映射，并为 `/attendance/*` 页面补了 SSR 降级，未签到名单 roster、异常修正 workflow、专用趋势序列仍待后端补齐。
- [/] `FE-16` Communication records/messages 各页面接真
  - 已接 `communication/records`、`communication/records/{id}`、`communication/templates`、`communication/message-tasks` 真接口；本轮移除了 family/student 硬编码名称映射，改为通过现有 families/students 真接口补全展示名；meeting/task 反查聚合与真实渠道发送 adapter 仍待后端。
- [/] `FE-17` Analytics overview/teaching/billing 各页面接真图表
  - 已接 `analytics/overview`、`analytics/teaching`、`analytics/billing` 真聚合数据；本轮去掉了页面内常驻 loading/empty/error 演示块并保留 SSR 友好降级；当前以前端解读卡替代正式图表组件，真实图形化图表与导出仍可继续增强。

#### Phase 3：表单交互（P1）

- [x] `FE-18` 新建学生表单 → `POST /students`
  - 学生列表页已新增真实创建表单，提交后回跳列表并展示成功/错误状态。
- [x] `FE-19` 作业上传表单 → `POST /files/upload/multipart` + `POST /homework/submissions`
  - 作业队列页已串起文件 multipart 上传 + submission 创建，使用真实 fileId 落库。
- [x] `FE-20` 复核提交 → `POST /homework/submissions/{id}/review`
  - 复核工作台正式提交已接真；另补了列表页“快速复核”表单，走同一真实接口。
- [/] `FE-21` 成长观察创建 → `POST /growth/observations`
  - 观察页已接真实创建表单；当前先基于首个 active rubric 渲染评分字段，模板切换仍待前端动态化。
- [/] `FE-22` 合同创建 → `POST /billing/contracts`
  - 合同页已接真实创建表单；当前先支持单条收费项录入，复杂多收费项编辑待后续增强。
- [/] `FE-23` 收款记录 → `POST /billing/invoices/{id}/payments`
  - 账单页已接真实收款表单并透传 idempotency key；支付列表聚合仍受后端接口缺口限制。

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
  - 已新增 contract smoke，覆盖 auth / settings / users / students / families / homework / growth / jobs 的代表性读链路与 envelope 结构；仍未做到“所有接口逐条”全覆盖。
- [x] `QA-07` auth 接口安全验证：过期 token、无效 token、权限不足
- [x] `QA-08` 分页接口统一验证：pageNo/pageSize/total 格式一致

#### 数据迁移验证

- [ ] `QA-09` 更新 `scripts/migration/run-staging-import.mjs` 对接真实 DB
- [ ] `QA-10` 用 `fixtures/staging-import-sample.csv` 执行首批导入
- [ ] `QA-11` 验证导入数据：字段映射正确、幂等性、reject report 生成

#### 页面验证

- [/] `QA-12` 所有 31 个页面 SSR 渲染成功（无 500 错误）
  - 2026-03-25：已修复 SSR smoke 的 API 启动阻塞（run-ssr-smoke API 路径 + Nest 模块 guard 依赖）；`/analytics/*` 页面已加 SSR fallback，当前仍卡在 `/attendance/board` 500，需继续逐页补齐 server-side fetch 降级或定位 API/页面异常根因。
  - 已新增 31 页 SSR smoke 脚本与路由收集逻辑；实际执行被 API Nest DI 启动失败阻塞（已定位并修补部分 repository/provider 问题，仍有 StudentsModule 依赖链待补齐）。
- [ ] `QA-13` 权限验证：teacher 角色不能访问 billing 页面
- [ ] `QA-14` 响应式检查：主要页面在 1280/1440/1920 宽度下无溢出

#### 发布准备

- [ ] `QA-15` 编写预发上线清单（包含 DB migration、seed、env 配置、健康检查）
- [ ] `QA-16` 编写回滚方案（DB rollback、代码回退、数据恢复）
- [ ] `QA-17` 输出验收报告：通过率、已知问题、推荐发布/不发布决定

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

- [ ] `BE-30` **CORS 配置**：
  - 在 `main.ts` 配置 `app.enableCors()` 
  - 只允许生产域名 + localhost（dev）
  - 配置 `credentials: true`

- [ ] `BE-31` **Helmet 安全头**：
  - 安装 `@nestjs/common` 内置 `helmet` 或 `helmet` 包
  - 配置 CSP、X-Frame-Options、X-Content-Type-Options 等

- [ ] `BE-32` **Rate Limiting**：
  - 安装 `@nestjs/throttler`
  - 全局限流：60 req/min
  - 登录接口特殊限流：5 req/min（防暴力破解）

- [ ] `BE-33` **输入校验强化**：
  - 确保所有 DTO 使用 `class-validator` 装饰器
  - 全局启用 `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
  - SQL 注入防护确认（Drizzle 参数化查询）

- [ ] `BE-34` **JWT Secret 生产化**：
  - 不允许使用默认 `growthpilot-dev-secret`
  - 启动时检查 `JWT_SECRET` 环境变量长度 ≥ 32 字符
  - 生产环境强制 HTTPS-only cookie

- [ ] `BE-35` **密码安全**：
  - 用户密码使用 `bcrypt`（cost factor ≥ 12）存储
  - 禁止明文密码存储和传输

- [ ] `BE-36` **敏感数据脱敏**：
  - API 响应中隐藏密码、token 等敏感字段
  - 日志中不输出密码和完整 token

#### 性能优化

- [ ] `BE-37` **数据库连接池**：
  - 配置 connection pool（min: 5, max: 20）
  - 配置连接超时和空闲回收

- [ ] `BE-38` **分页查询优化**：
  - 大表查询添加适当索引
  - 列表接口默认 pageSize 上限为 100

- [ ] `BE-39` **文件上传限制**：
  - 单文件上限 20MB
  - 请求 body 上限 50MB
  - 支持文件类型白名单（image/pdf/doc/xls）

- [ ] `BE-40` **响应压缩**：
  - 启用 `compression` 中间件（gzip）

#### 日志与监控

- [ ] `BE-41` **结构化日志**：
  - 接入 `pino` 或 `winston`
  - JSON 格式输出
  - 包含 requestId、userId、method、path、status、duration

- [ ] `BE-42` **健康检查端点**：
  - `GET /health` — 返回 `{ status: "ok", version, uptime }`
  - `GET /health/ready` — 检查 DB + Redis + S3 连接

- [ ] `BE-43` **错误追踪预留**：
  - 全局异常过滤器统一格式：`{ code, message, requestId, timestamp }`
  - 预留 Sentry/Bugsnag 接入点（通过环境变量开关）

**验收**：
- 安全扫描无 critical/high 漏洞
- 压测：50 并发下 P99 < 500ms
- health check 端点可用

---

### Agent INFRA — 容器化与 CI/CD

**目标**：让项目可以一键构建 Docker 镜像、自动化部署到服务器。

#### 容器化

- [ ] `INF-10` **API Dockerfile**：
  ```dockerfile
  # apps/api/Dockerfile
  # 多阶段构建：builder(npm ci + build) → runner(node:20-alpine + dist)
  # 暴露端口 3000
  # CMD ["node", "dist/main.js"]
  ```

- [ ] `INF-11` **Web Dockerfile**：
  ```dockerfile
  # apps/web/Dockerfile
  # 多阶段构建：deps → builder(next build) → runner(next start)
  # 暴露端口 3001
  # 使用 standalone output
  ```

- [ ] `INF-12` **docker-compose.prod.yml**：
  ```yaml
  # 包含：api, web, postgres, redis, minio, nginx
  # nginx 反向代理：
  #   / → web:3001
  #   /api → api:3000
  # volumes: postgres-data, minio-data, redis-data
  # restart: always
  # 环境变量从 .env.prod 读取
  ```

- [ ] `INF-13` **Nginx 配置**：
  - 创建 `deploy/nginx/nginx.conf`
  - 反向代理 web 和 api
  - 静态资源缓存策略
  - gzip 压缩
  - SSL/TLS 终结点预留（Let's Encrypt 或云证书）

- [ ] `INF-14` **创建 `.env.prod.example`**：
  ```env
  NODE_ENV=production
  DATABASE_URL=postgresql://gp:STRONG_PASSWORD@db:5432/growthpilot
  REDIS_URL=redis://redis:6379
  JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
  JWT_ACCESS_TTL_SECONDS=900
  JWT_REFRESH_TTL_SECONDS=2592000
  S3_ENDPOINT=http://minio:9000
  S3_ACCESS_KEY=REPLACE
  S3_SECRET_KEY=REPLACE
  S3_BUCKET=growthpilot
  CORS_ORIGIN=https://your-domain.com
  API_BASE_URL=https://your-domain.com/api
  ```

#### CI/CD 流水线

- [ ] `INF-15` **更新 `.github/workflows/ci.yml`**：
  - 添加 Docker build 步骤
  - 添加 Docker image push（到 Docker Hub / GHCR / 阿里云 ACR）
  - 添加 tag 触发生产部署

- [ ] `INF-16` **创建 `.github/workflows/deploy.yml`**：
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

- [ ] `INF-17` **创建部署脚本 `deploy/scripts/deploy.sh`**：
  ```bash
  # 1. 拉取最新镜像
  # 2. 备份当前数据库
  # 3. 运行 migration
  # 4. 重启服务
  # 5. 健康检查
  # 6. 如果失败 → 回滚数据库 + 回退镜像
  ```

- [ ] `INF-18` **创建回滚脚本 `deploy/scripts/rollback.sh`**：
  ```bash
  # 1. 恢复上一个镜像版本
  # 2. 恢复数据库备份
  # 3. 重启服务
  # 4. 健康检查
  ```

#### 数据库运维

- [ ] `INF-19` **数据库 Migration 命令**：
  - `npm run db:migrate` — 执行迁移
  - `npm run db:seed` — 执行种子数据
  - `npm run db:reset` — 清空重建（仅 dev）
  - `npm run db:backup` — pg_dump 备份

- [ ] `INF-20` **数据库自动备份**：
  - 创建 `deploy/scripts/db-backup.sh`
  - 每日自动备份（cron）
  - 保留最近 30 天备份
  - 备份到独立存储目录

- [ ] `INF-21` **SSL/TLS 证书**：
  - 创建 `deploy/nginx/ssl/` 目录
  - 预留 Let's Encrypt certbot 配置
  - 或创建自签证书脚本用于测试

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

- [ ] `QA-20` **迁移脚本生产化**：
  - 从 staging 脚本升级为可连接生产 DB 的正式脚本
  - 支持 `--dry-run` 模式（只输出变更，不写入）
  - 支持 `--report-only` 模式（只生成校验报告）

- [ ] `QA-21` **迁移顺序编排**：
  1. 基础字典（grade_levels, subjects, error_tags, habit_dimensions, fee_items）
  2. 校区、学期
  3. 教师
  4. 家庭 + 监护人
  5. 学生 + 在读档 + 教师分配
  6. 收费方案 + 合同 + 账单 + 收款
  7. 作业提交 + AI 分析 + 教师复核
  8. 习惯观察 + 成长目标
  9. 设备 + 绑定 + 签到 + 学习时长

- [ ] `QA-22` **数据清洗规则确认**：
  - 字段映射对照表（Excel 列名 → DB 字段）
  - 空值处理规则
  - 日期格式统一
  - 手机号/身份证号脱敏或校验
  - 重复数据去重策略（student_no + 姓名 + 学期）

- [ ] `QA-23` **全量迁移执行**：
  - 在 staging 环境执行全量迁移
  - 输出 `migration-report.json`（成功数/失败数/跳过数/reject 列表）
  - 人工校验 reject 数据

- [ ] `QA-24` **迁移数据校验**：
  - 总数核对（Excel 行数 vs DB 记录数）
  - 关键字段抽样（每表抽 10 条核对）
  - 外键完整性检查（学生→家庭→监护人链路）
  - 金额一致性检查（合同金额 = Σ 账单金额）

#### 用户验收测试（UAT）

- [ ] `QA-25` **UAT 测试计划编写**：
  - 按角色分：super_admin / principal / teacher / finance
  - 每个角色 5-8 个核心场景
  - 预期结果明确

- [ ] `QA-26` **UAT 环境搭建**：
  - 部署 staging/UAT 环境
  - 导入迁移后的真实数据
  - 创建 UAT 测试账号

- [ ] `QA-27` **UAT 执行**（需用户参与）：
  - super_admin 场景：用户管理、角色分配、系统设置
  - principal 场景：Dashboard 总览、学生 360、教师排班、分析报表
  - teacher 场景：作业列表、复核工作台、习惯观察、成长目标
  - finance 场景：合同管理、账单开具、收款记录、退费处理

- [ ] `QA-28` **UAT 问题清单收集与修复**：
  - 记录所有问题（blocker / major / minor）
  - blocker 必须修复后才可上线
  - major 最迟上线后 3 天内修复
  - minor 归入后续迭代

- [ ] `QA-29` **性能基准测试**：
  - 模拟 50 并发用户
  - 首页加载 < 3s
  - API 列表查询 P95 < 300ms
  - 文件上传 10MB < 5s

**验收**：
- 全量迁移成功，reject 率 < 2%
- UAT blocker 数量 = 0
- 性能达标

---

## Wave 5：正式上线（UAT 通过后）

### Agent INFRA — 生产环境部署

**目标**：完成服务器配置、域名解析、SSL 证书、正式服务启动。

#### 服务器准备

- [ ] `INF-30` **服务器环境初始化**：
  - 安装 Docker + Docker Compose
  - 安装 Node.js 20（备用直接运行）
  - 配置防火墙：只开放 80/443/22
  - 创建部署用户（非 root）
  - 配置 SSH key 登录（禁用密码登录）

- [ ] `INF-31` **域名与 DNS**：
  - 域名 A 记录指向服务器 IP
  - 配置 www → 非 www 重定向（或反之）

- [ ] `INF-32` **SSL 证书配置**：
  - 安装 certbot / acme.sh
  - 申请 Let's Encrypt 证书
  - 配置自动续期（cron）
  - Nginx 启用 HTTPS + HTTP→HTTPS 重定向

- [ ] `INF-33` **生产环境变量配置**：
  - 在服务器创建 `.env.prod`（从 `.env.prod.example` 复制并填写真实值）
  - JWT_SECRET 生成 64 位随机字符串
  - 数据库密码使用强密码
  - S3 密钥配置

- [ ] `INF-34` **日志收集配置**：
  - Docker logs 输出到文件
  - 配置 logrotate（日志轮转，保留 30 天）
  - 或接入日志服务（阿里云 SLS / 自建 Loki）

- [ ] `INF-35` **监控告警**：
  - 配置 uptime 检查（UptimeRobot / 自建）
  - 监控端点：`/health` + `/health/ready`
  - 磁盘空间告警（> 80%）
  - 数据库连接数告警

#### 上线执行

- [ ] `INF-36` **生产数据库初始化**：
  ```bash
  # 1. 创建数据库
  docker compose -f docker-compose.prod.yml exec db createdb -U gp growthpilot
  # 2. 执行 migration
  npm run db:migrate
  # 3. 执行 seed
  npm run db:seed
  ```

- [ ] `INF-37` **生产数据迁移**：
  - 执行全量 Excel 数据导入
  - 启用 `--report-only` 先做 dry-run
  - 确认后执行正式导入
  - 保存迁移报告

- [ ] `INF-38` **首次部署**：
  ```bash
  # 1. 拉取代码或推送镜像
  # 2. docker compose -f docker-compose.prod.yml up -d
  # 3. 等待所有服务健康
  # 4. 访问域名验证
  ```

- [ ] `INF-39` **上线冒烟验证**：
  - 访问首页可加载
  - 登录流程可完成
  - 学生列表可显示迁移数据
  - 作业上传可正常工作
  - 文件下载可正常工作

### Agent QA — 上线验收

- [ ] `QA-30` **Go/No-Go 检查清单**：
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

- [ ] `QA-31` **上线后 24h 监控**：
  - 持续观察错误日志
  - 监控 API 响应时间
  - 监控数据库连接数和慢查询
  - 监控磁盘和内存使用

- [ ] `QA-32` **上线后 72h 稳定性确认**：
  - 无 P0/P1 级别 bug
  - 数据库备份正常执行
  - 用户反馈收集

- [ ] `QA-33` **发布验收报告**：
  - 版本号、发布时间、发布人
  - 包含功能列表
  - 已知限制
  - 后续迭代计划

#### 运维文档

- [ ] `QA-34` **运维手册编写**：
  - 服务器架构图
  - 服务启停命令
  - 日志查看方法
  - 常见问题排查
  - 数据库备份恢复流程
  - 紧急联系人

- [ ] `QA-35` **用户操作手册**（简版）：
  - 各角色首次登录指引
  - 核心操作流程截图
  - FAQ

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
