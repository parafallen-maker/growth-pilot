# GrowthPilot 多 Agent 协作 Checkpoint Todo

> **Baseline**: commit `3ef447a` (feat: close growth pilot page polish and workflow APIs)
> **日期**: 2026-03-30
> **前序文档**: `agent_todo_list.md`（三 Agent 版, Gate-1 已关闭）、`execution_todos.md`（Wave 0/1 已归档）
> **本文件定位**: 基于最新代码全量复盘产出的 **下一轮执行主清单**，覆盖上轮遗留问题 + 新引入问题 + 体验优化方向。所有已完成的任务不再重复。

---

## 执行规则

1. 状态约定：`[ ]` 未开始 · `[/]` 进行中 · `[x]` 已完成 · `[!]` 阻塞
2. 每个任务完成后追加备注：`日期 / 关键文件 / 验证方式`
3. Agent 只改自己所有权范围内的文件；跨边界需求挂到对方待办
4. P0 必须在 Checkpoint-2 前关闭；所有 `[x]` 至少通过一次 `npm run lint && npm run test`
5. 若发现共享组件或契约不够用，回挂到 Agent FE-INFRA 或 Agent BE 的待办

---

## Agent 角色定义

| Agent | 职责域 | 文件所有权 |
|-------|--------|-----------|
| **Agent FE-INFRA** | 前端共享基建：全局壳层、通用组件、样式系统、路由级 loading/error | `packages/ui/`, `apps/web/src/components/business/`, `apps/web/src/app/globals.css`, `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/loading.tsx`(新建), `apps/web/src/app/(dashboard)/error.tsx`(新建), `apps/web/src/lib/` |
| **Agent BE** | 后端基建：安全、性能、数据层、API 契约、测试修复 | `apps/api/src/`, `apps/api/test/`, `apps/api/package.json`, `packages/schema/src/`, `docs/growthpilot/api/`, `scripts/` |
| **Agent FE-BIZ** | 业务页面：调试文字清理、交互增强、空状态、详情页 | `apps/web/src/app/(dashboard)/*/page.tsx`, `apps/web/src/app/(dashboard)/*/actions.ts`, `apps/web/src/services/` |
| **Agent QA** | 验收：CI 全绿、角色链路走查、回归 | `apps/api/test/`, `apps/web/test/`, 文档标注 |

---

## Checkpoint 闸门

- [ ] **Checkpoint-1 — 基建修复**
  - 条件：`FI-01` ~ `FI-04` + `BE-01` ~ `BE-05` 全部完成
  - 结果：CI 全绿（lint + typecheck + test 全过）、native module 不再阻断开发、权限模型安全
- [ ] **Checkpoint-2 — P0 体验修复**
  - 条件：`BZ-01` ~ `BZ-06` 全部完成
  - 结果：所有面向用户的页面无调试信息泄露、有 loading/error boundary、Dashboard 可切换
- [ ] **Checkpoint-3 — 体验增强**
  - 条件：`FI-05` ~ `FI-08` + `BZ-07` ~ `BZ-12` 全部完成
  - 结果：批改流程、批量操作、移动端、空状态达到可交付标准
- [ ] **Checkpoint-4 — 生产就绪**
  - 条件：`BE-06` ~ `BE-10` + `QA-01` ~ `QA-05` 全部完成
  - 结果：数据层统一、性能优化落地、E2E 链路验收通过

---

## Agent FE-INFRA — 前端共享基建

**目标**: 把路由级体验兜底、样式系统、通用组件的基础能力做到位，供 Agent FE-BIZ 直接使用。

### Checkpoint-1 范围

- [ ] `FI-01` **添加路由级 loading boundary**
  - 在 `apps/web/src/app/(dashboard)/loading.tsx` 新建文件，导出 `LoadingState`（已有组件，在 `page-states.tsx`）
  - 效果：所有 dashboard 子路由在 Server Component 数据获取时显示骨架屏而非白屏
  - 验证：`npm run build --workspace @growthpilot/web`；浏览器慢速 3G 模拟确认骨架屏出现

- [ ] `FI-02` **添加路由级 error boundary**
  - 在 `apps/web/src/app/(dashboard)/error.tsx` 新建 `'use client'` 组件
  - 复用 `ErrorState` + 添加 `reset` 按钮（调用 Next.js error boundary 的 `reset()` 函数）
  - 验证：人为抛出 API 500，确认显示品牌化错误页而非 Next.js 默认页

- [ ] `FI-03` **Toast 刷新不重复**
  - `apps/web/src/app/(dashboard)/_components/query-status-toast.tsx`
  - Toast 显示后用 `window.history.replaceState` 清除 URL 中的 `?created=xxx` / `?updated=xxx` 参数
  - 验证：提交表单 → 看到 Toast → 刷新页面 → 不再重复显示

- [ ] `FI-04` **DataTable 添加 `overflow-x: auto` 包裹**
  - `packages/ui/src/page-primitives.tsx` 的 `DataTable` 组件
  - 表格外层加 `<div style={{ overflowX: 'auto' }}>` 或等效 CSS class
  - 验证：移动端模拟器 375px 宽度下表格可水平滚动，不撑破页面

### Checkpoint-3 范围

- [ ] `FI-05` **搜索输入防抖**
  - 封装 `DebouncedSearchInput` 客户端组件（300ms 防抖），替换当前直接触发 form submit 的搜索框
  - 影响页面：students、families、teachers、homework/submissions 等列表页
  - 验证：快速连续输入 5 个字符，Network 面板只发出 1 次请求

- [ ] `FI-06` **全局空状态统一**
  - 在 `page-states.tsx` 中定义标准 `EmptyState`（图标 + 标题 + 描述 + 可选 CTA 按钮）
  - 导出为 `packages/ui` 的公共组件
  - 验证：typecheck 通过

- [ ] `FI-07` **CSS 变量化为深色模式铺路**
  - `globals.css` 中所有硬编码颜色改为 CSS 自定义属性（`--color-bg-primary` 等）
  - 暂不实现深色模式，但确保主题切换只需 override 变量
  - 验证：视觉无回归 + `npm run build` 通过

- [ ] `FI-08` **面包屑标准化推广**
  - 确认 `PageBreadcrumbs` 组件 API 稳定
  - 输出一份"需要接入面包屑的页面清单"，供 Agent FE-BIZ 逐页接入
  - 验证：组件 typecheck 通过

---

## Agent BE — 后端基建与安全

**目标**: 消除 CI 阻断、修复安全漏洞、优化性能瓶颈、统一数据层。

### Checkpoint-1 范围

- [ ] `BE-01` **bcrypt → bcryptjs 替换** ⚡ 阻断测试
  - `apps/api/src/common/security.ts:32` — `require('bcrypt')` → `require('bcryptjs')`
  - `apps/api/src/modules/users/repository/users.repository.ts:16` — 同上
  - `apps/api/package.json` — 卸载 `bcrypt`，安装 `bcryptjs` + `@types/bcryptjs`
  - 验证：`npm run test --workspace @growthpilot/api` 全部 9 个测试文件通过

- [ ] `BE-02` **修复 E2E 测试 async/await 缺失**
  - `apps/api/test/qa/growth.e2e-skeleton.test.ts` — 所有 service 方法调用前加 `await`
  - `apps/api/test/qa/homework.e2e-skeleton.test.ts` — `assert.throws` → `assert.rejects`
  - `apps/api/test/qa/openapi-contract.test.ts` — OpenAPI 文件路径对齐至 `docs/growthpilot/api/openapi.yaml`
  - 验证：`npm run test --workspace @growthpilot/api` 12/12 pass

- [ ] `BE-03` **Alerts/Tasks 控制器权限粒度修复**
  - `apps/api/src/modules/alerts/controller/alerts.controller.ts` — 创建/修改/删除用独立权限（`alert:create`, `alert:update`, `alert:delete`），不复用 `alert:view`
  - `apps/api/src/modules/tasks/controller/tasks.controller.ts` — 同上
  - 同步更新 `packages/schema/src/index.ts` 的 Permission 类型
  - 验证：typecheck + 测试通过

- [ ] `BE-04` **资源归属校验（数据隔离）**
  - Tasks/Alerts Service 的 update/delete 方法需校验 `createdBy === currentUser.id`
  - 或引入 ownership middleware
  - 验证：编写测试用例覆盖"教师 A 不能修改教师 B 的任务"

- [ ] `BE-05` **AI 适配器 JSON.parse 容错**
  - `apps/api/src/modules/homework/adapter/openai-compatible-homework-analysis.adapter.ts:114`
  - `JSON.parse` 包裹 try-catch，失败时返回降级结构 `{ error: 'AI 返回了无法解析的内容', raw: ... }`
  - 验证：单元测试覆盖 malformed JSON 场景

### Checkpoint-4 范围

- [ ] `BE-06` **N+1 查询修复: Users.list**
  - `apps/api/src/modules/users/repository/users.repository.ts` — `list()` 方法内的 `enrichUser` 改为批量 JOIN 或预加载
  - 验证：对比修复前后 10 用户场景的查询次数

- [ ] `BE-07` **内存过滤 → DB 层过滤**
  - Alerts/Tasks/Analytics Service 当前从 repo 取全量再 `.filter()`
  - 改为在 Repository 层传入 filter 条件，由 Drizzle 生成 WHERE 子句
  - 验证：typecheck + 测试通过

- [ ] `BE-08` **批量操作串行 → 并行**
  - `apps/api/src/modules/homework/service/homework.service.ts` — `bulkTriggerAnalysis` 的 for-of 改为 `Promise.allSettled` + 并发限制（如 pLimit(5)）
  - 返回值包含每条结果的 success/failure 状态
  - 验证：测试覆盖部分成功场景

- [ ] `BE-09` **完成 JSON → DB 全量迁移**
  - 新模块（Tasks, Alerts）仅保留 DB 适配器，删除 JSON 适配器
  - 运行 `scripts/migration/backfill-workflow-persistence.mjs` 验证数据迁移
  - 验证：`GP_PERSISTENCE_ADAPTER=db npm run test` 全部通过

- [ ] `BE-10` **从 Drizzle schema 自动推导 TS 类型**
  - 使用 `drizzle-zod` 或手动 `InferSelectModel<typeof xxxTable>` 替代 `packages/schema` 中的手写接口
  - 消除两份类型定义的不一致风险
  - 验证：typecheck 通过，删除重复的手写接口

---

## Agent FE-BIZ — 业务页面体验闭环

**目标**: 清理所有面向用户的调试信息、补全交互反馈、提升核心流程体验。

### Checkpoint-2 范围 — P0 调试信息清理

> **总原则**: 移除所有 `<span className="badge success">POST /xxx</span>` endpoint badge、技术描述文字（"当前表单直连 POST /xxx"、"避免 SSR 直接失败"、"降级展示"、API 路径引用），替换为面向用户的操作说明或直接删除。

- [ ] `BZ-01` **考勤模块调试清理**
  - `apps/web/src/app/(dashboard)/attendance/board/page.tsx` — 移除 `POST /attendance/events` badge、"出勤数据暂不可用"、"避免 SSR 直接失败"、API 路径引用
  - `apps/web/src/app/(dashboard)/attendance/devices/page.tsx` — 移除 `POST /attendance/devices` badge、"当前表单直连 POST..."
  - 替换为：正式的空状态文案（如"暂无考勤记录"）
  - 验证：浏览器查看两个页面，无任何技术术语

- [ ] `BZ-02` **收费模块调试清理**
  - `billing/invoices/page.tsx` — 移除 `POST /billing/invoices`、`POST /payments`、`GET /billing/payments/{id}`
  - `billing/contracts/page.tsx` — 移除 `POST /billing/contracts` badge
  - `billing/products/page.tsx` — 移除 `POST /billing/products` badge
  - `billing/renewals/page.tsx` — 移除 `POST /billing/renewals`、`PATCH /billing/renewals/{id}/status`
  - 验证：浏览器查看 4 个页面

- [ ] `BZ-03` **沟通模块调试清理**
  - `communication/messages/page.tsx` — 移除 `POST /communication/templates`、`POST /communication/message-tasks`
  - `communication/records/page.tsx` — 移除 `POST /communication/records`、"不伪造闭环"
  - 验证：浏览器查看 2 个页面

- [ ] `BZ-04` **成长模块调试清理**
  - `growth/goals/page.tsx` — 移除 `POST /growth/goals`、`POST /checkins`
  - `growth/observations/page.tsx` — 移除 `POST /growth/observations`
  - `growth/reports/page.tsx` — 移除 `POST /generate`
  - `growth/rubrics/page.tsx` — 移除 `POST /growth/rubrics`
  - 验证：浏览器查看 4 个页面

- [ ] `BZ-05` **核心页面调试清理**
  - `students/page.tsx` — 移除 `POST /students` badge
  - `teachers/page.tsx` — 移除 `POST /teachers` badge
  - `families/page.tsx` — 移除 `POST /families` badge
  - `tasks/page.tsx` — 移除 `GET /tasks` badge
  - `homework/error-taxonomies/page.tsx` — 移除 `POST ready` badge
  - 验证：浏览器查看 5 个页面

- [ ] `BZ-06` **分析模块调试清理 + Dashboard 硬编码修复**
  - `analytics/billing/page.tsx` — 移除 "收费分析暂不可用"、"降级策略"
  - `analytics/overview/page.tsx` — 移除 "总览暂不可用"、"降级策略"
  - `analytics/teaching/page.tsx` — 移除 "教学分析暂不可用"、"降级策略"
  - `dashboard/page.tsx:15-16` — 移除硬编码 `campusId='campus-guiyang'`、`termId='2026-spring'`，改为从用户 context 或 URL 参数读取
  - "切学期" 按钮接入真实切换逻辑（至少跳转到学期选择页）
  - 验证：浏览器查看 4 个页面 + Dashboard 切学期可交互

### Checkpoint-3 范围 — 体验增强

- [ ] `BZ-07` **作业批改页: 图片预览灯箱**
  - `homework/review/[submissionId]/page.tsx`
  - 学生作业图片点击后弹出全屏灯箱，支持缩放和左右切换
  - 可用 `<dialog>` 原生元素 + CSS 实现，不引入外部库
  - 验证：浏览器上传含图片的作业 → 点击图片 → 灯箱弹出

- [ ] `BZ-08` **作业批改页: 键盘快捷键**
  - 支持 `←` `→` 翻页（上一份/下一份）、`Enter` 确认提交、`Esc` 关闭灯箱/取消
  - 在页面底部添加快捷键提示条
  - 验证：键盘操作可完成完整批改流程

- [ ] `BZ-09` **作业批改页: 自动跳转下一份**
  - 批改完成后自动跳转到下一份未批改作业（需 Service 层提供 "下一份" API 或前端维护队列）
  - 跳转前显示 1.5s 的 "已保存，正在跳转..." 提示
  - 验证：连续批改 3 份作业无需手动导航

- [ ] `BZ-10` **批量操作增加确认对话框**
  - 所有破坏性批量操作（批量删除、批量标记）弹出确认对话框
  - 对话框显示影响数量（如 "确认批量标记 12 份作业？"）
  - 验证：选中多条 → 点击批量操作 → 确认框弹出

- [ ] `BZ-11` **批量操作增加进度/结果反馈**
  - 批量请求发出后显示进度条或已处理条数
  - 完成后显示 "成功 N 条，失败 M 条" 的结果摘要
  - 对接后端 `BE-08` 的 `Promise.allSettled` 返回值
  - 验证：批量触发 5 条 AI 分析 → 进度可见 → 结果分条显示
  - 依赖：`BE-08`

- [ ] `BZ-12` **全局空状态接入**
  - 使用 Agent FE-INFRA 的 `FI-06` 产出的 `EmptyState` 组件
  - 逐页替换空表格为友好空状态（至少覆盖 students/families/teachers/tasks/alerts/homework 6 个列表页）
  - 验证：删除所有种子数据 → 各页面显示友好空状态
  - 依赖：`FI-06`

---

## Agent QA — 验收

### Checkpoint-4 范围

- [ ] `QA-01` **CI 全绿验证**
  - `npm run lint && npm run test` 全部通过
  - 记录通过数量和耗时
  - 验证：截图/日志留档

- [ ] `QA-02` **管理员核心链路走查**
  - login → Dashboard（管理员视角）→ 创建家庭 → 创建学生 → 分配教师 → 查看学生 360
  - 全程无白屏、无调试文字、无报错
  - 验证：录屏或截图留档

- [ ] `QA-03` **教师核心链路走查**
  - login → Dashboard（教师工作台）→ 查看待批改列表 → 进入批改页 → 触发 AI 分析 → 完成批改 → 自动跳转
  - 验证：录屏或截图留档

- [ ] `QA-04` **移动端体验验收**
  - 375px (iPhone SE) 宽度下测试 Dashboard、Students、Homework 三个页面
  - 确认：表格可滚动、导航可折叠、表单可操作
  - 验证：浏览器 DevTools 截图留档

- [ ] `QA-05` **性能基线验收**
  - Lighthouse 跑分（Performance / Accessibility / Best Practices）
  - 目标：Performance ≥ 60, Accessibility ≥ 80
  - 验证：Lighthouse 报告留档

---

## 依赖关系图

```
Checkpoint-1 (基建修复)
├── Agent FE-INFRA: FI-01, FI-02, FI-03, FI-04
└── Agent BE:       BE-01, BE-02, BE-03, BE-04, BE-05
         │
         ▼
Checkpoint-2 (P0 体验修复)
└── Agent FE-BIZ:   BZ-01 ~ BZ-06
         │
         ▼
Checkpoint-3 (体验增强)
├── Agent FE-INFRA: FI-05, FI-06, FI-07, FI-08
└── Agent FE-BIZ:   BZ-07 ~ BZ-12
    ├── BZ-11 ← BE-08
    └── BZ-12 ← FI-06
         │
         ▼
Checkpoint-4 (生产就绪)
├── Agent BE:       BE-06 ~ BE-10
└── Agent QA:       QA-01 ~ QA-05
```

**并行策略**:
- Checkpoint-1: Agent FE-INFRA 与 Agent BE **并行**
- Checkpoint-2: Agent FE-BIZ 可在 Checkpoint-1 完成前**提前启动**调试文字清理（不依赖基建产物）
- Checkpoint-3: Agent FE-INFRA 和 Agent FE-BIZ **并行**，但 `BZ-11` 等待 `BE-08`，`BZ-12` 等待 `FI-06`
- Checkpoint-4: Agent BE 和 Agent QA **并行**

---

## 任务统计

| Agent | 任务数 | Checkpoint-1 | Checkpoint-2 | Checkpoint-3 | Checkpoint-4 |
|-------|-----:|:---:|:---:|:---:|:---:|
| FE-INFRA | 8 | 4 | — | 4 | — |
| BE | 10 | 5 | — | — | 5 |
| FE-BIZ | 12 | — | 6 | 6 | — |
| QA | 5 | — | — | — | 5 |
| **合计** | **35** | **9** | **6** | **10** | **10** |

预计工期：Checkpoint-1 (1-2天) → Checkpoint-2 (1-2天) → Checkpoint-3 (3-4天) → Checkpoint-4 (2-3天)，**总计 ~8-11 天**。

---

## 快速启动指令

### Agent FE-INFRA（Checkpoint-1 开始）
```
请阅读 docs/growthpilot/multi_agent_checkpoint_todos.md 中 "Agent FE-INFRA" 部分。
从 FI-01 开始按顺序执行。完成每项后在文件中标记 [x] 并补充验证备注。
仓库: /path/to/growth-pilot
```

### Agent BE（Checkpoint-1 开始，与 FE-INFRA 并行）
```
请阅读 docs/growthpilot/multi_agent_checkpoint_todos.md 中 "Agent BE" 部分。
从 BE-01 开始按顺序执行。BE-01 为最高优先级（阻断所有测试）。
完成每项后在文件中标记 [x] 并补充验证备注。
仓库: /path/to/growth-pilot
```

### Agent FE-BIZ（Checkpoint-1 完成后，或提前启动调试清理）
```
请阅读 docs/growthpilot/multi_agent_checkpoint_todos.md 中 "Agent FE-BIZ" 部分。
BZ-01 ~ BZ-06 是调试文字清理，可立即启动，不依赖其他 Agent。
从 BZ-01 开始按顺序执行。完成每项后在文件中标记 [x] 并补充验证备注。
仓库: /path/to/growth-pilot
```

### Agent QA（Checkpoint-3 基本完成后）
```
请阅读 docs/growthpilot/multi_agent_checkpoint_todos.md 中 "Agent QA" 部分。
从 QA-01 开始执行验收。需要在浏览器已登录态下操作。
仓库: /path/to/growth-pilot
```
