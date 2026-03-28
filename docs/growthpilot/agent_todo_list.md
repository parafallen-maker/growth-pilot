# GrowthPilot 三 Agent 协作 Todo List

> Source of Truth：本文件基于 [问题清单与优化方案.md](./问题清单与优化方案.md) 与 [多 Agent 协作派工清单.md](./多%20Agent%20协作派工清单.md) 收敛而成，是 3 个 agent 的执行主清单。
> 11-agent 拆分版继续保留在 `多 Agent 协作派工清单.md` 作为细粒度参考；实际推进、打勾与阶段验收以本文件为准。

---

## 执行规则

1. 状态约定：`[ ]` 未开始、`[/]` 进行中、`[x]` 已完成、`[\!]` 阻塞
2. 每个任务完成后，在该任务后补充一句备注：`日期 / 关键文件 / 验证方式`
3. Agent 只修改自己文件所有权范围内的文件；跨边界需求先在依赖项下挂起，不直接抢改
4. 所有 `P0` 项必须在 `Gate-2` 前关闭；所有打 `[x]` 的任务默认要求至少完成一次构建或对应测试验证
5. 若 Agent 3 在接页时发现共享组件或接口契约不够用，应回挂到 Agent 1 或 Agent 2 的待办，不在业务页内临时绕过

---

## 三 Agent 映射

| 新 Agent | 责任域 | 对应原派工 |
| :--- | :--- | :--- |
| Agent 1 | 共享前端基建与全局交互底座 | Agent-A + Agent-G 的共享层 + Agent-K 的全局壳层 |
| Agent 2 | 后端能力、数据契约与生产就绪底座 | Agent-B + Agent-E 的后端部分 + Agent-I + Agent-J |
| Agent 3 | 业务页面补全、前端集成与体验闭环 | Agent-C + Agent-D + Agent-F + Agent-H + Agent-G/K 的页面层 |

---

## 阶段闸门

- [ ] `Gate-1` 共享底座就绪
  - 条件：`AG1-01` 至 `AG1-06` 完成，且 `AG2-01` 至 `AG2-06` 完成
  - 结果：Agent 3 可以稳定接入筛选、Tab、提交态、任务/预警 API、教师工作台 API
- [ ] `Gate-2` 核心 P0 业务链打通
  - 条件：`AG3-01` 至 `AG3-07` 完成
  - 结果：任务中心、预警中心、家庭创建、教师创建、作业复核实时反馈全部可用
- [ ] `Gate-3` 关键体验一致性完成
  - 条件：`AG1-07` 至 `AG1-09` 完成，且 `AG3-08` 至 `AG3-16` 完成
  - 结果：详情页、Toast、分页、按钮模式、移动端与图表体验达到可交付标准
- [ ] `Gate-4` 生产就绪能力完成
  - 条件：`AG2-07` 至 `AG2-10` 完成
  - 结果：Schema、数据库、AI Provider、迁移验证具备上线准备条件

---

## Agent 1 - 共享前端基建与全局交互

**职责**

- 搭好所有业务页复用的交互组件和页面壳层
- 把“筛选/Tab/提交态/分页/状态页/Toast/移动端壳层/基础无障碍”一次性做成通用能力
- 为 Agent 3 提供稳定 props 契约，避免业务页各自造轮子

**文件所有权**

- `packages/ui/src/page-primitives.tsx`
- `apps/web/src/components/business/page-states.tsx`
- `apps/web/src/components/business/submit-button.tsx`（新建）
- `apps/web/src/components/business/toast-provider.tsx`（新建）
- `apps/web/src/components/business/app-shell.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/business-logic.ts`
- `apps/web/src/lib/navigation.ts`

**交付给其他 Agent 的产物**

- 可直接接页的 `FilterBar`、`TabStrip`、`SubmitButton`、`PaginationBar`、可排序 `DataTable`
- 标准化 `EmptyState / ErrorState / ForbiddenState`
- 全局 Toast 能力、AppShell 移动端壳层、基础 ARIA 与 skip-to-content

### Checklist

- [ ] `AG1-01` 将 `FilterBar` 重构为可提交 URL searchParams 的真实筛选组件，支持字段配置与 options 注入，对应 `P0-2`
- [ ] `AG1-02` 将 `TabStrip` 重构为可切换的链接式 Tab，支持 `baseUrl` 与 `tab` 参数，对应 `P0-3`
- [ ] `AG1-03` 新建 `SubmitButton` 客户端组件，使用 `useFormStatus` 提供 loading + disabled，对应 `P0-4`
- [ ] `AG1-04` 升级 `DataTable` 表头排序能力，支持 `sortKey` 与 URL 排序参数，对应 `P1-3`
- [ ] `AG1-05` 新增 `PaginationBar`，统一 prev/next/pageNo/pageSize 的 URL 约定，对应 `P1-2`
- [ ] `AG1-06` 统一 `page-states.tsx` 文案与空状态能力，修正错误页、禁止页与空态描述，对应 `P1-5`、`P1-6`
- [ ] `AG1-07` 新建 `toast-provider.tsx` 并在 AppShell 注入全局 Toast 能力，对应 `P1-1`
- [ ] `AG1-08` 在共享层清理残留调试文案和死按钮入口，统一 `<a>` / `<Link>` / `<button>` 的使用约定，对应 `P1-9`、`P1-10`
- [ ] `AG1-09` 完成 AppShell 移动端折叠、汉堡菜单、skip-to-content 与基础 ARIA 支撑，对应 `P2-1`、`P2-3`

**验收标准**

- `packages/ui` 与 `apps/web` 编译通过
- 共享组件 props 契约稳定，Agent 3 无需再改共享组件即可接入业务页
- 至少选择 2 个现有页面做接入验证，确认筛选、Tab、分页、提交态和 Toast 正常工作

---

## Agent 2 - 后端能力与生产就绪底座

**职责**

- 搭建任务中心、预警中心、教师工作台等前端依赖的真实后端能力
- 收口数据契约、Schema、数据库迁移与 AI Provider，保证后续不再停留在文件持久化和 mock 能力
- 为 Agent 3 提供稳定 API 与类型契约

**文件所有权**

- `apps/api/src/modules/tasks/`（新建）
- `apps/api/src/modules/alerts/`（新建）
- `apps/api/src/modules/analytics/**`
- `apps/api/src/modules/homework/adapter/**`
- `apps/api/src/modules/*/repository/**`
- `apps/api/src/app.module.ts`
- `packages/schema/src/index.ts`
- `apps/api/test/**`（与本轮任务相关的新增或补充测试）

**交付给其他 Agent 的产物**

- `tasks` / `alerts` / `analytics/teacher-workbench` 的稳定 API
- 作业分析状态查询契约
- 前后端共享类型、PostgreSQL 持久化能力、真实 AI Provider 接口

### Checklist

- [ ] `AG2-01` 新建 `TasksModule`，提供 `POST / GET / PATCH /tasks`，支持 `open -> in_progress -> done` 状态流转，对应 `P0-1`
- [ ] `AG2-02` 新建 `AlertsModule`，提供 `POST / GET / PATCH /alerts`，支持 `open -> acknowledged -> resolved` 状态流转，对应 `P0-1`
- [ ] `AG2-03` 在 `app.module.ts` 注册 `TasksModule` 和 `AlertsModule`
- [ ] `AG2-04` 为 `tasks` 与 `alerts` 补齐基础测试，至少覆盖查询、创建、状态流转
- [ ] `AG2-05` 为 analytics 增加 `teacher-workbench` 聚合端点，提供教师工作台真实数据，对应 `P1-8`
- [ ] `AG2-06` 为作业复核补齐分析状态查询契约，确保前端可轮询或订阅分析完成状态，对应 `P0-5`
- [ ] `AG2-07` 在 `packages/schema` 中补全任务、预警、教师工作台及相关 domain entity 类型，对应 `C2`
- [ ] `AG2-08` 将各 repository 从文件持久化逐步切换到 PostgreSQL，对应 `C1`
- [ ] `AG2-09` 完成 PostgreSQL 数据迁移脚本与 seed/回填验证，对应 `C1`
- [ ] `AG2-10` 将作业分析 adapter 接到真实 AI Provider，而非 mock adapter，对应 `C3`

**验收标准**

- `apps/api` 构建通过，相关测试通过
- Agent 3 不需要再依赖 stub 数据即可接通任务、预警、教师工作台与作业分析状态
- Schema 与 API 契约稳定，前后端字段命名一致

---

## Agent 3 - 业务页面补全与体验闭环

**职责**

- 基于 Agent 1 的共享组件和 Agent 2 的真实接口，完成所有核心页面接入与交互闭环
- 优先解决 `P0` 业务阻断，再补齐 `P1` 体验，再收尾 `P2` 页面层优化
- 只负责业务页、页面服务层和 server action，不回改共享组件与后端模块

**文件所有权**

- `apps/web/src/app/(dashboard)/families/**`
- `apps/web/src/app/(dashboard)/teachers/**`
- `apps/web/src/app/(dashboard)/tasks/**`
- `apps/web/src/app/(dashboard)/alerts/**`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/homework/error-taxonomies/**`
- `apps/web/src/app/(dashboard)/homework/review/[submissionId]/**`
- `apps/web/src/app/(dashboard)/**/page.tsx` 中与分页、空态、导出、批量、移动端、图表增强直接相关的业务页面
- `apps/web/src/services/tasks-service.ts`（新建）
- `apps/web/src/services/alerts-service.ts`（新建）
- `apps/web/src/services/analytics-service.ts`
- `apps/web/src/services/homework-service.ts`

**前置依赖**

- `AG3-03`、`AG3-04` 依赖 `AG1-01`、`AG1-05`、`AG2-01`、`AG2-02`
- `AG3-05` 依赖 `AG2-05`
- `AG3-07` 依赖 `AG1-03`、`AG2-06`
- `AG3-08` 依赖 `AG1-02`
- `AG3-11` 依赖 `AG1-01`、`AG1-03`、`AG1-05`、`AG1-07`

### Checklist

- [ ] `AG3-01` 在 `families/page.tsx` 中补全创建家庭表单，并新增 `families/actions.ts`，修复“新建家庭”无功能，对应 `P0-6`
- [ ] `AG3-02` 在 `teachers/page.tsx` 中补全创建教师表单，并新增 `teachers/actions.ts`，修复“新建教师”无功能，对应 `P0-7`
- [ ] `AG3-03` 新建 `tasks-service.ts`，把 `tasks/page.tsx` 与 `tasks/list/page.tsx` 从 stub 切到真实 API，并接入筛选、分页、状态流转，对应 `P0-1`
- [ ] `AG3-04` 新建 `alerts-service.ts`，把 `alerts/page.tsx` 从 stub 切到真实 API，并接入筛选、确认、解决动作，对应 `P0-1`
- [ ] `AG3-05` 在 `analytics-service.ts` 增加 `queryTeacherWorkbench()` 前端调用，并把 `dashboard/page.tsx` 的教师工作台替换为真实数据，对应 `P1-8`
- [ ] `AG3-06` 为 `homework/error-taxonomies/page.tsx` 增加创建/编辑表单与 `actions.ts`，把错因词典从只读变成可维护，对应 `P1-11`
- [ ] `AG3-07` 在作业复核页接入分析状态轮询或实时刷新逻辑，并替换为 `SubmitButton` 提交态，保证教师触发 AI 后无需手动刷新，对应 `P0-5`
- [ ] `AG3-08` 丰富教师详情页，保证 5 个 Tab 都显示真实数据，对应 `P1-4`
- [ ] `AG3-09` 丰富家庭详情页，接入家庭任务与沟通记录真实数据，对应 `P1-4`
- [ ] `AG3-10` 将成长报告编辑器从单一 `textarea` 升级为结构化表单编辑体验，对应 `P1-7`
- [ ] `AG3-11` 将 `FilterBar`、`PaginationBar`、`SubmitButton`、Toast 结果提示推广到 10+ 业务页面，统一列表与表单体验，对应 `P1-1`、`P1-2`
- [ ] `AG3-12` 在业务页面清理调试文字、空壳按钮和不一致文案，落实按钮规范与 EmptyState 落地，对应 `P1-5`、`P1-9`、`P1-10`
- [ ] `AG3-13` 实现批量操作能力，至少覆盖批量标签、批量触发 AI、批量报告，对应 `P2-6`
- [ ] `AG3-14` 实现 10+ 页面导出逻辑，补齐 CSV/Excel 导出闭环，对应 `P2-7`
- [ ] `AG3-15` 为详情页和关键页面补充面包屑、页面级移动端响应式收口，对应 `P2-2`、`P2-3`
- [ ] `AG3-16` 为 `MetricGrid` 和 `ChartPanel` 增加趋势指示与真实图表形态，提升教师工作台与关键分析页表达，对应 `P2-4`、`P2-5`

**验收标准**

- `P0` 全部关闭，核心链路可跑通：教师工作台 -> 待复核作业 -> AI 分析结果自动反馈 -> 任务中心追踪；管理员可创建家庭、教师并在预警中心查看真实数据
- 业务页不再存在死按钮、纯展示筛选、不可切换 Tab、重复提交表单
- 关键页面的分页、Toast、空状态、详情页内容、移动端体验达到一致标准

---

## 联调顺序建议

1. Agent 1 与 Agent 2 并行推进，先完成 `Gate-1`
2. Agent 3 在 `Gate-1` 后优先完成 `AG3-01` 到 `AG3-07`，先把全部 `P0` 闭环
3. `P0` 关闭后，Agent 1 补 Toast/移动端/无障碍，Agent 3 同步做详情页、分页推广、导出与批量
4. 最后由 Agent 2 收口 Schema、PostgreSQL、迁移验证与 AI Provider，完成 `Gate-4`

---

## 最终验收

- [ ] `QA-01` 7 个 `P0` 页面逐一验证，无死按钮、无假数据阻断
- [ ] `QA-02` 教师、管理员、财务 3 个角色至少各走完 1 条核心业务链
- [ ] `QA-03` `npm run build` 通过
- [ ] `QA-04` API 与前端相关测试通过
- [ ] `QA-05` 所有已完成项都带有备注，能追溯是谁在什么文件做了什么验证
