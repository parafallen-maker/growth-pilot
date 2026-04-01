# GrowthPilot 项目全面分析报告

> 基于最新提交 `3ef447a` (feat: close growth pilot page polish and workflow APIs)
> 分析日期: 2026-03-30

---

## 一、CI 现状基线

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Lint (tsc --noEmit) | ✅ 5/5 workspace 全部通过 | api, web, config, schema, ui |
| API 测试 (9 个测试文件) | ❌ 0/9 通过 | 全部因 native `bcrypt` 崩溃 |
| Web 测试 (3 个) | ✅ 3/3 通过 | QA-12 路由清单, QA-13 权限, QA-14 响应式 |
| **总计** | **3 pass / 9 fail** | **阻断原因: bcrypt native module code-signing 失败** |

### 阻断问题: bcrypt 原生模块

`apps/api/src/common/security.ts:32` 和 `apps/api/src/modules/users/repository/users.repository.ts:16` 仍在使用 `require('bcrypt')`（native 模块），在 macOS Apple Silicon 上因 code-signing 校验失败导致 **所有 9 个 API 测试全军覆没**。

**修复方案**: 将 `bcrypt` 替换为 `bcryptjs`（纯 JS 实现），已在上次会话中验证过可行。

---

## 二、用户体验问题（重点）

### 🔴 P0 — 阻断用户认知的严重 UX 问题

#### 1. 开发调试信息泄露到生产界面（~20 个页面）

**问题**: 大量页面向终端用户暴露了 API endpoint badge（如 `POST /billing/invoices`）、技术说明文字（如 "当前表单直连 POST /xxx"、"避免 SSR 直接失败"、"降级展示"），这些内容对教师/家长用户毫无意义，严重损害产品专业感。

**涉及页面清单**:

| 页面 | 暴露内容 |
|------|---------|
| `attendance/board/page.tsx` | `POST /attendance/events` badge、"出勤数据暂不可用"、"避免 SSR 直接失败" |
| `attendance/devices/page.tsx` | `POST /attendance/devices` badge、"当前表单直连 POST..." |
| `billing/invoices/page.tsx` | `POST /billing/invoices`、`POST /payments`、`GET /billing/payments/{id}` |
| `billing/contracts/page.tsx` | `POST /billing/contracts` badge、技术描述 |
| `billing/products/page.tsx` | `POST /billing/products` badge |
| `billing/renewals/page.tsx` | `POST /billing/renewals`、`PATCH /billing/renewals/{id}/status` |
| `communication/messages/page.tsx` | `POST /communication/templates`、`POST /communication/message-tasks` |
| `communication/records/page.tsx` | `POST /communication/records`、"不伪造闭环" |
| `families/page.tsx` | `POST /families` badge |
| `growth/goals/page.tsx` | `POST /growth/goals`、`POST /checkins` badge |
| `growth/observations/page.tsx` | `POST /growth/observations` badge |
| `growth/reports/page.tsx` | `POST /generate` badge |
| `growth/rubrics/page.tsx` | `POST /growth/rubrics` badge |
| `students/page.tsx` | `POST /students` badge |
| `teachers/page.tsx` | `POST /teachers` badge |
| `tasks/page.tsx` | `GET /tasks` badge |
| `homework/error-taxonomies/page.tsx` | `POST ready` badge |
| `analytics/billing/page.tsx` | "收费分析暂不可用"、"降级策略" |
| `analytics/overview/page.tsx` | "总览暂不可用"、"降级策略" |
| `analytics/teaching/page.tsx` | "教学分析暂不可用"、"降级策略" |

**修复方向**: 移除所有 `<span className="badge success">POST /xxx</span>` 和技术描述文字，替换为面向用户的操作说明（如 "提交后自动刷新列表"）。

#### 2. 缺少全局 loading.tsx 和 error.tsx

**问题**: `apps/web/src/app/(dashboard)/` 目录下 **没有任何 `loading.tsx` 或 `error.tsx` 文件**。当 Server Component 数据获取耗时或失败时：
- 用户看到白屏等待（无加载骨架屏）
- 服务端错误返回默认 Next.js 500 页面（无品牌化错误提示）

**现状**: 项目已有完善的 `LoadingState`、`ErrorState` 组件（`page-states.tsx`），但完全没有被用于路由级别的 loading/error boundary。

**修复方向**:
```
apps/web/src/app/(dashboard)/loading.tsx  → export { LoadingState as default }
apps/web/src/app/(dashboard)/error.tsx    → 'use client'; export default ErrorState with reset
```

#### 3. Dashboard 硬编码 campusId / termId

`dashboard/page.tsx:15-16`:
```ts
const campusId = 'campus-guiyang';
const termId = '2026-spring';
```
管理员和教师都被锁定在固定的贵阳校区和 2026 春季学期，无法切换。"切学期" 按钮也只是一个无功能的 `<button>`。

---

### 🟡 P1 — 影响使用效率的 UX 问题

#### 4. Toast 通知依赖 URL 参数导致重复提示

表单提交成功后通过 `?created=xxx` URL 参数触发 Toast，用户刷新页面会再次看到成功提示。

**涉及**: `QueryStatusToast` 组件 + 所有使用 `redirect('...?created=xxx')` 的 action 文件。

**修复方向**: Toast 显示后应通过 `replaceState` 清除 URL 参数，或改用 session-based flash message。

#### 5. 批量操作缺少进度反馈

新增的 `BulkActions` 组件 (`_components/bulk-actions.tsx`) 提供了批量选择 UI，但：
- 批量操作执行时无进度指示（后端 `bulkTriggerAnalysis` 是串行 for 循环）
- 批量失败无部分成功/部分失败的细粒度反馈
- 缺少确认对话框（批量删除等破坏性操作）

#### 6. 作业批改页缺少关键交互

`homework/review/[submissionId]/page.tsx`:
- ❌ 无图片预览灯箱（学生作业图片无法放大查看）
- ❌ 无键盘快捷键（← → 上下翻页, Enter 确认, Esc 取消）
- ❌ 批改完成后无自动跳转到下一份未批改作业
- ✅ 新增了 `AnalysisStatusAutoRefresh` 组件（AI 分析状态轮询）— 这是进步

#### 7. 表格在移动端的适配问题

`DataTable` 组件 (`packages/ui/src/page-primitives.tsx`) 未添加 `overflow-x: auto` 包裹，多列表格在手机屏幕上会溢出导致水平滚动。

#### 8. 详情页缺少面包屑导航

家庭详情 `families/[familyId]/page.tsx` 和教师详情 `teachers/[teacherId]/page.tsx` 有新增的丰富内容，但没有面包屑导航，用户需要用浏览器返回键。虽然有 `PageBreadcrumbs` 组件，但使用不够普遍。

---

### 🟢 P2 — 体验优化建议

#### 9. 空状态体验不一致
部分页面使用了 `EmptyState` 组件（有图标和引导文案），但大部分列表页在无数据时只显示空表格。

#### 10. 搜索/筛选无防抖
搜索输入框直接触发 form submit（Server Action），无客户端防抖，快速输入会触发多次请求。

#### 11. 无深色模式
`globals.css` 中所有颜色都是固定值，未使用 CSS 变量或 `prefers-color-scheme` 媒体查询。

---

## 三、后端代码质量与安全问题

### 🔴 安全问题

| # | 问题 | 位置 | 严重程度 |
|---|------|------|---------|
| S1 | Alerts/Tasks 控制器权限粒度不足 | `alerts/controller/alerts.controller.ts`, `tasks/controller/tasks.controller.ts` | **高** — 查看权限即可创建/修改 |
| S2 | 缺少资源归属校验 | Tasks/Alerts 模块 | **高** — 教师A可修改教师B的任务 |
| S3 | AI 适配器 JSON.parse 无容错 | `homework/adapter/openai-compatible-homework-analysis.adapter.ts:114` | **中** — LLM 返回非标 JSON 会崩溃 |
| S4 | native bcrypt 阻断所有测试 | `common/security.ts:32`, `users/repository/users.repository.ts:16` | **高** — 开发环境不可用 |

### ⚡ 性能问题

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| P1 | N+1 查询: `DbUsersRepository.list` 对每个用户调 `enrichUser` | `users/repository/users.repository.ts` | 用户多时响应缓慢 |
| P2 | 内存过滤: Alerts/Tasks/Analytics 从 repo 取全量再 `.filter()` | `alerts/service`, `tasks/service`, `analytics/service` | 数据增长后 OOM 风险 |
| P3 | 批量操作串行: `bulkTriggerAnalysis` 用 for-of 循环 | `homework/service/homework.service.ts:132` | 大批量请求超时 |
| P4 | 竞态条件: ID 基于数组长度计算 | `growth/service/growth.service.ts:45` | 并发创建会 ID 冲突 |

### 🔧 代码质量

| # | 问题 | 说明 |
|---|------|------|
| Q1 | Alerts/Tasks Service 代码几乎完全重复 | 应提取 CRUD 基类 |
| Q2 | Analytics Service 耦合所有 Repository | 应走事件驱动或预聚合模式 |
| Q3 | 两份 OpenAPI 规格文件 | `07_OpenAPI.yaml` 和 `api/openapi.yaml` 可能不同步 |
| Q4 | 混合持久化 (JSON + DB) 无统一切换策略 | 应尽快完成 DB 迁移并删除 JSON 适配器 |

---

## 四、架构与数据层问题

### 数据持久化混乱

当前系统处于 JSON → PostgreSQL 迁移中途状态：
- `GP_PERSISTENCE_ADAPTER=db` 环境变量控制切换
- 默认仍是 `file`（JSON 文件存储），生产级功能（任务、预警）也依赖 JSON
- 存在 `backfill-workflow-persistence.mjs` 迁移脚本，但尚未强制执行

**建议**: 新模块（Tasks, Alerts）应 **只** 实现 DB 适配器，不再写 JSON 适配器。

### Schema 不一致

- `packages/schema/src/index.ts` 中的 TypeScript 接口与 `apps/api/src/db/schema/` 的 Drizzle 表定义有差异（如 `createdAt`/`updatedAt` 字段缺失）
- 应从 Drizzle schema 自动推导 TS 类型，而非手动维护两份

### 环境配置风险

- `.env.example` 有开发密钥（`growthpilot-dev-secret`）— 虽有运行时校验但仍存在误用风险
- `drizzle.config.ts` 硬编码了数据库 fallback URL

---

## 五、改进优先级路线图

### 第一阶段 — 立即修复（1-2 天）

| 序号 | 任务 | 预计工时 |
|------|------|---------|
| 1 | 替换 bcrypt → bcryptjs，修复所有测试 | 0.5h |
| 2 | 清理 ~20 个页面的调试文字和 endpoint badge | 3h |
| 3 | 添加 `loading.tsx` + `error.tsx` 到 dashboard 路由 | 0.5h |
| 4 | 修复 Toast URL 参数刷新重复问题 | 1h |
| 5 | 修复 Alerts/Tasks 控制器权限粒度 | 1h |

### 第二阶段 — 本周完成（3-5 天）

| 序号 | 任务 | 预计工时 |
|------|------|---------|
| 6 | Dashboard 支持校区/学期切换（去掉硬编码） | 2h |
| 7 | 作业批改页: 图片灯箱 + 键盘快捷键 + 自动跳转 | 4h |
| 8 | DataTable 移动端横向滚动适配 | 1h |
| 9 | 批量操作增加确认对话框和进度反馈 | 2h |
| 10 | 提取 Alerts/Tasks Service 的 CRUD 基类 | 2h |
| 11 | 修复 N+1 查询 (Users.list + enrichUser) | 1h |

### 第三阶段 — 下一迭代（1-2 周）

| 序号 | 任务 | 预计工时 |
|------|------|---------|
| 12 | 完成 JSON → DB 全量迁移，删除 File 适配器 | 5h |
| 13 | 从 Drizzle schema 自动生成 TS 类型 | 3h |
| 14 | Analytics Service 解耦（预聚合或事件驱动） | 4h |
| 15 | AI 分析适配器健壮性（重试、降级、结构化输出） | 3h |
| 16 | 全局空状态统一 + 搜索防抖 | 2h |
| 17 | 深色模式支持（CSS 变量化） | 4h |

---

## 六、亮点（最新提交的积极变化）

1. **角色差异化 Dashboard** — 教师/管理员看到不同内容，教师有工作台、待办、批改队列
2. **Tasks & Alerts 模块** — 增加了任务管理和预警系统，业务闭环更完整
3. **AI 作业分析** — 集成了 OpenAI Compatible 适配器，支持结构化分析
4. **批量操作** — 作业批量触发分析、批量标记、成长报告批量发布
5. **CSV 导出** — 各列表页支持一键导出 CSV
6. **AnalysisStatusAutoRefresh** — AI 分析状态自动轮询刷新
7. **PermissionGuard** — 基于权限的页面访问控制

---

*报告生成: 2026-03-30 | 分析范围: 后端 (9 modules) + 前端 (~34 pages) + 架构 + CI*
