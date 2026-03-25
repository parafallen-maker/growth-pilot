# 28 实装阶段多 Agent 执行 Todo

> 目标：从“骨架可跑 / mock 可联调”进入“真数据库 / 真对象存储 / 真鉴权 / 真队列 / 真迁移 / 真验收”的实装阶段。
> 说明：这份文档不是规划稿，而是**执行清单**。默认自动推进，直到交付真实系统版本。

---

## 0. 阶段定义

当前项目状态：
- 已完成：模块骨架、页面骨架、契约收口、迁移 dry-run、QA skeleton
- 未完成：真实基础设施与真实业务持久化

所以“实装阶段”的本质不是继续加页面，而是做 5 件事：
1. 把 in-memory repository 换成真实 DB repository
2. 把 mock session 换成 JWT / refresh token / 权限守卫
3. 把 mock storage 换成真实对象存储上传链路
4. 把 mock jobs 换成可追踪的持久化任务与队列执行
5. 把 dry-run migration / QA skeleton 换成真实样本导入与真实联调验收

一句话：**从样板间，进入能住人的毛坯房施工。**

---

## 1. 实装阶段总原则

### 1.1 优先级顺序
1. 基础设施真化
2. 主数据真化
3. homework / growth 真化
4. billing / communication / attendance / analytics 真化
5. migration / QA / release 真化

### 1.2 不再允许的做法
- 继续新增只有 mock 的新模块
- 页面绕过后端契约直接猜字段
- 业务状态只写在前端 store、不入库
- 文件继续只传 metadata 不接真实上传
- 异步任务只有“返回 jobId”但没有真实可追踪执行链路

### 1.3 完成定义（实装阶段）
一个任务只有满足以下 6 条，才算 done：
1. [ ] 不再依赖 in-memory repository
2. [ ] 已有真实数据表 / migration / seed 或接入方案
3. [ ] 已有集成测试或可运行 smoke
4. [ ] 与前端页面已联调
5. [ ] 文档/契约同步
6. [ ] 已进主线并可被 QA 接手

---

## 2. 多 Agent 分工（实装阶段）

| Agent | 实装阶段职责 |
|---|---|
| A2 Domain Model | DDL / 状态机 / 字段口径继续守门，处理真实入库前的约束与迁移问题 |
| A3 API Steward | OpenAPI / DTO / 错误体 / jobs / report publish 等契约继续收口 |
| A4 Backend Foundation | auth / users / settings / files / jobs 真化 |
| A5 Backend Core | teachers / students / families / enrollments / student 360 真化 |
| A6 Backend Biz | homework / growth / attendance 真化 |
| A7 Backend Finance | billing / communication / analytics 真化 |
| A8 Frontend Core | 核心页面改接真实接口、权限与错误流收口 |
| A9 Frontend Biz | 作业 / 成长 / 收费 / 沟通 / 出勤 / 分析页面改接真实接口 |
| A10 QA + Migration | migration、集成测试、E2E、预发、回滚、发布验收 |

---

## 3. 实装阶段任务清单

## IMPL-001 基础设施真化（P0）

### A4-1 真实鉴权
- [x] JWT access token / refresh token 持久化
- [x] refresh rotation
- [x] logout token 失效链路
- [x] 权限 guard / permission policy 真化
- [x] 401 / 403 / 409 / 422 标准错误体收口

### A4-2 真实文件上传
- [x] multipart 上传入口
- [x] 对象存储 adapter 接真实 S3 兼容存储
- [x] file asset 元数据落库（当前为 file-backed 持久化，正式 DB 仍待替换）
- [ ] upload -> fileId -> submission 真链路打通

### A4-3 真实 jobs 基础设施
- [x] jobs 表持久化 repository
- [x] jobs 列表接口
- [x] job 状态推进与 retry 基础能力（当前为文件持久化 + 进程内 runner，真实队列仍待补）
- [~] AI / report draft / 聚合任务统一接入 jobs（homework analyze / growth report draft 已接，聚合类任务仍待统一）

**DoD**
- 不再依赖 mock session
- fileId 来自真实上传
- jobId 可在数据库和接口中追踪

---

## IMPL-002 主数据真化（P0）

### A5-1 teachers / students / families / enrollments 持久化
- [x] 从 in-memory 替换为真实 repository
- [x] 唯一约束与 DDL 对齐：
  - student_no
  - employee_no
  - family_code
  - enrollment 唯一约束
- [x] students/families/guardians/enrollments 事务收口
- notes:
  - 2026-03-25：A5 已在 `apps/api` 落 `MasterDataStore` 文件持久层（`.runtime/master-data.json` / 测试态 `apps/api/.data/master-data.json`），teachers / students / families / guardians / enrollments 改为真实读写。
  - 已在 repository 层落 employee_no / student_no / family_code / `(student_id,campus_id,term_id)` 唯一校验，并通过 store 事务提交 + 原子 rename 体现事务边界。

### A5-2 Student 360 真聚合
- [x] student 基础信息真实聚合
- [x] family / guardians / enrollment 真聚合
- [x] homework / growth / attendance / billing 摘要位接真实查询
- [x] recentTimeline 统一口径
- notes:
  - 2026-03-25：`GET /students/{studentId}/360` 已从真实 repository 聚合 student + currentEnrollment + family + guardians，recentTimeline 首屏加入主档/家庭/在读档真实落库事件。
  - 2026-03-25：`StudentsService` 已改为直接读取 homework / growth / attendance / billing 仓储，`homeworkSummary` / `growthSummary` / `attendanceSummary` / `billingSummary` 与 `recentTimeline` 不再依赖硬编码 snapshot；测试已覆盖真实仓储聚合。

**DoD**
- Student 360 不再返回纯 mock summary
- 主数据可被 migration 正式导入

---

## IMPL-003 homework 真系统化（P0）

### A6-1 submission 真入库
- [x] fileIds 校验接真实 file assets
- [x] submission / submission_files 真落库
- [x] 列表 / 详情改成真实 repository

### A6-2 analysis 真任务化
- [x] ai_jobs 真落库
- [ ] adapter 接真实 provider 配置边界
- [x] rawMarkdown / structuredOutput / provider / model / promptVersion 留痕入库
- [x] analyze 去重、失败重试、状态推进

### A6-3 review 真事务
- [x] review / review_error_items 真事务
- [x] draft 保存接口（若保留）
- [x] HomeworkReviewed 事件总线 / outbox 方案（当前为 homework.json 内 outbox 基础队列，正式消息基础设施仍待替换）

> 2026-03-25 A6 第一波：已把 homework submissions / submission_files / analyses / reviews / review_error_items 从运行时数组替换为 `apps/api/.data/homework.json` 持久化；analyze 任务接入 `apps/api/.data/jobs.json`，job 的 queued/running/success/failed、attempts、startedAt/finishedAt 可重启后追踪。
> 2026-03-25 A6 第二波：已补 `GET/PUT /homework/submissions/:submissionId/review-draft`、`GET /homework/outbox-events` 与 `GET/POST/PATCH/DELETE /homework/error-taxonomies`，review draft 与 HomeworkSubmitted/HomeworkReviewed outbox 事件均可重启保留。仍未接真实 PG/Redis 队列。


### A9-1 homework 页面联调真接口
- [x] submissions 列表接真数据
- [x] review workbench 接真 detail
- [x] error-taxonomies 接真维护接口
- [x] draft / analyze / review 动作闭环

**DoD**
- submission -> analyze -> review 走真实数据链
- A10 能基于真实接口跑 E2E

---

## IMPL-004 growth 真系统化（P0）

### A6-4 growth 持久化
- [x] rubrics 真 repository
- [x] observations 真 repository
- [x] goals / check-ins 真 repository
- [x] report drafts 真 repository
- [x] ReportDraftJob 真 jobs 接入

> 2026-03-25 A6 第一波：已把 rubrics / observations / goals / check-ins / reports 从运行时数组替换为 `apps/api/.data/growth.json` 持久化；report draft job 接入统一 jobs repository，不再单独挂 growth 内存 jobs。
> 2026-03-25 A6 第二波：已补 `GET /growth/reports/:reportId`、`POST /growth/reports/:reportId/review`、`POST /growth/reports/:reportId/publish`，report workflow 固定为 `draft -> reviewed -> published`，`reportPublished` 口径统一为“是否已被 published report 的 materialRefs/growthObservations 引用”。当前仍是同步执行的轻量 job runner，尚未接真实队列。

### A3-1 growth report 契约补齐
- [x] report review / publish 动作
- [x] reportPublished 口径
- [ ] praise_records 是否纳入首发的最终裁决

### A9-2 growth 页面联调真接口
- [x] rubrics 真接口接入
- [x] observations / goals / reports 接真数据
- [ ] report draft job 异步态联通

**DoD**
- observation -> goal -> report draft 走真实数据链
- report draft 可追踪到 job 与素材池

---

## IMPL-005 billing / communication / attendance / analytics 真系统化（P0/P1）

### A7-1 billing 真化
- [x] products / contracts / invoices / payments / refunds 持久化
- [x] renewals 持久化
- [ ] billing_adjustments 决策：补接口或明确后置
- [x] 支付 / 退款事务与 invoice 状态一致性

> 2026-03-25 A7 第一波：billing repository 已切到 JSON 文件持久层（`apps/api/.data/billing.json`），products/contracts/invoices/payments/refunds/renewals 重启后可保留；payment/refund 仍保留事务快照回滚与 invoice 状态回写。billing_adjustments 仍未落接口，先记后置。

### A7-2 communication 真化
- [x] records / templates / message_tasks 持久化
- [x] sent / failed / read 状态链路与时间戳落库

> 2026-03-25 A7 第一波：communication repository 已切到 JSON 文件持久层（`apps/api/.data/communication.json`），records/templates/message_tasks 状态流转改为落盘，可追踪 sent/failed/read 时间戳链路。

### A6-5 attendance 真化
- [x] devices / bindings / events 持久化
- [x] binding active 唯一性落库（当前为 repository 规则约束，正式 DB 唯一索引仍待补）
- [x] event 去重 / Idempotency-Key 落库（当前为 repository 规则约束，正式 DB 幂等约束仍待补）
- [x] homework_time_daily_stats 真聚合

### A7-3 analytics 真化
- [x] overview / teaching / billing 真实聚合查询
- [ ] 指标口径文档与查询实现对齐
- [x] teaching 看板从空占位变成真实数据

> 2026-03-25 A7 第一波：analytics 已改为 repository 聚合，不再直接返回纯手写 mock 常量；当前真实读取 billing + communication + attendance + homework 仓储数据，overview/billing/teaching 均可返回非静态聚合结果。指标口径文档细化仍待补齐。

### A9-3 页面联调
- [~] billing 页面接真接口（products/contracts/invoices/renewals 已接；payments/refunds/adjustments 列表聚合仍待后端）
- [ ] communication 页面接真接口
- [ ] attendance 页面接真接口
- [x] analytics 页面接真接口与真图表数据

**DoD**
- 合同 -> 账单 -> 支付 -> 退款 真闭环
- 沟通 / 出勤 / 分析不再只吃 mock service

---

## IMPL-006 migration / QA / release 真系统化（P0）

### A10-1 migration 真导入
- [x] 接真实 Excel/CSV parser（当前已支持 CSV/JSON 文件输入，`.xlsx` 原生解析仍待补）
- [ ] 接 PostgreSQL staging schema
- [ ] 接 final load upsert
- [x] 第一批真实样本导入（当前为 sample CSV dry-run）
- [ ] 正式 validation report

### A10-2 QA 真联调
- [x] skeleton tests 扩成真实 E2E（auth/enrollment/homework/growth/billing 已有 executable assertions）
- [x] 主流程 smoke 变成真实回归
- [ ] 缺陷单 + triage + 回归报告

### A10-3 release 真验收
- [ ] 预发环境校验
- [ ] 备份与恢复演练
- [ ] 回滚演练
- [ ] go / no-go 签收

**DoD**
- 第一批真实样本导入通过
- P0/P1 缺陷清零
- 预发环境可发布可回滚

---

## 4. 建议执行波次

### Wave-I1：基础设施真化
- A4：IMPL-001
- A2：约束守门配合
- A3：契约守门配合

### Wave-I2：主数据与核心链路真化
- A5：IMPL-002
- A6：IMPL-003 / IMPL-004（后端）
- A8/A9：页面改接真实接口

### Wave-I3：经营与运营真化
- A7：IMPL-005（后端）
- A9：对应前端联调

### Wave-I4：迁移与发布
- A10：IMPL-006

---

## 5. 第一波立刻开工（Now）

### NOW-1 A4 基础设施真化
- [x] JWT / refresh token 真化
- [x] files multipart + object storage 真化
- [x] jobs list + 持久化真化

> 2026-03-25 A4 IMPL-001 第一波已落地：
> - auth：从 in-memory session 改为文件持久化 session store + HMAC JWT access/refresh，refresh 走 rotation，logout 可失效持久化会话。
> - files：新增 `/files/upload/multipart` 骨架，object storage 默认切到本地 `local-s3-compatible` 实现，并保留 mock adapter 便于替换/测试；file asset 元数据改为文件持久化。
> - jobs：jobs repository 改为文件持久化，新增 `GET /jobs` 列表接口，并补 attempts/queuedAt/startedAt/finishedAt/retry 基础字段链路。
> - 2026-03-25 第二波补齐：已增加全局 HTTP exception filter，统一输出 401/403/409/422 标准错误体；已增加 `ApiAuthGuard` + `PermissionGuard` + `@RequirePermission()` 权限守卫基础层。
- 当前仍未真化项：refresh token 黑名单/多端策略、真实 S3 SDK 接入、数据库/Redis/BullMQ 真队列。

### NOW-2 A5 主数据真化
- [x] students / families / teachers / enrollments repository 真化
- [x] Student 360 真聚合

### NOW-3 A6 homework / growth 真化
- [x] homework submission / review 真入库
- [x] growth rubrics / observations / goals 真入库
- [x] report draft job 真接 jobs

### NOW-4 A7 经营模块真化
- [x] billing 真持久化
- [x] communication 真持久化
- [x] analytics 真聚合

### NOW-5 A10 真样本与真联调准备
- [~] migration dry-run -> 真实输入（CSV/JSON 已支持，staging/upsert 与 `.xlsx` 仍待补）
- [x] skeleton QA -> 真接口 smoke

---

## 6. 实装阶段的完成标志

当下面这些都成立，才算“骨架换成真系统”：

- [ ] auth 不再是 mock session
- [ ] files 不再是 metadata-only + mock storage
- [ ] jobs 不再只有假查询
- [ ] 主数据模块不再依赖 in-memory
- [ ] homework / growth / billing / communication / attendance / analytics 均有真实 repository 或真实聚合
- [ ] migration 已导入真实样本
- [ ] QA 已跑真实主流程
- [ ] 预发可发布可回滚

---

## 7. 最后一句话

**前一阶段我们把工地搭起来了；这一阶段，是把钢筋、水电、承重墙和管道真正装进去。**
