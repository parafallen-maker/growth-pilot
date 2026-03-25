# 29 核心多 Agent 协同总 Todo

> 目标：把 `docs/growthpilot/` 现有规划、WBS、派工、校核、迁移、验收文档收束成**唯一主控盘**。
> 原则：这不是再写一份规划稿，而是把“谁做什么、做到哪、下一步干什么、如何验收”钉成执行面板。
> 使用方式：后续多 Agent 协同时，优先更新本文件；其他文档继续作为依据与专题报告存在。

---

## 0. 当前阶段判断

项目已完成：
- Wave0 范围冻结、DDL/协议基线、协作机制
- 多数前后端骨架
- 后端第一波实装：大量模块已从 in-memory 走到 JSON 持久化
- API smoke/test 已可跑

项目未完成：
- 真数据库（PG/SQLite）
- 真对象存储（S3/presign/multipart）
- 真队列（Redis/BullMQ/worker/retry）
- Web 全域去 mock、改接真接口
- 真实 migration / 真实 E2E / 真实预发与回滚

一句话：**已经不是毛坯图纸阶段，但也还没到能正式入住。**

---

## 1. 唯一执行波次

## W0｜规格冻结与协作底座（已完成）

### 目标
冻结范围、协议、DDL、协作方式。

### 依据文档
- `15_多Agent协作任务总文件.md`
- `16_多Agent派工清单.yaml`
- `19_Wave0范围冻结结论.md`
- `20_DDL与迁移校核报告.md`
- `21_API协议基线与类型生成规范.md`

### 状态
- [x] 已完成

### 主要产物
- 模块边界、WBS、协作规则、DDL 校核、OpenAPI/错误体基线

---

## W1｜基础设施真化（进行中）

### 目标
把 auth / files / jobs 从 mock 骨架推进到真基础设施。

### Agent
- A3：协议与错误体守门
- A4：auth / files / jobs 实装
- A8：前端权限入口与登录态
- A10：基础 smoke

### 任务

#### IMPL-001-1 鉴权真化
- [x] JWT access/refresh 持久化
- [x] refresh rotation
- [x] logout revoke 基础链路
- [x] 全局 HTTP 标准错误体（401/403/409/422）
- [x] auth guard / permission guard 基础实现
- [ ] 守卫真正挂到主要控制器
- [ ] current user / permission code 真正接入 Web
- [ ] refresh 黑名单 / 多端策略

#### IMPL-001-2 文件真化
- [x] multipart 上传入口
- [x] file asset JSON 持久化
- [x] local-s3-compatible adapter
- [ ] 真 S3 SDK / presign / multipart 完整链路
- [ ] upload -> fileId -> submission 前后端闭环

#### IMPL-001-3 jobs 真化
- [x] jobs repository 持久化
- [x] jobs 列表 / 详情接口
- [x] retry 字段与基础动作
- [ ] worker 驱动 queued -> running -> success/failed
- [ ] retry/backoff 策略
- [ ] homework/growth/聚合任务统一 jobs 执行框架

### 当前判断
- 后端基础设施已有 60~70% 雏形
- 但还不是 PG/Redis/S3 级别真基础设施

---

## W2｜主数据真化（后端强，前端缺口大）

### 目标
打通 teachers / students / families / enrollments / Student360 / files 主数据底座。

### Agent
- A2：字段/约束/状态机守门
- A5：主数据后端
- A8：主数据前端
- A10：导入与验收

### 任务

#### IMPL-002-1 主数据仓储
- [x] teachers/students/families/guardians/enrollments 持久化
- [x] 唯一约束与事务边界
- [ ] 正式 DB schema + migration 落地

#### IMPL-002-2 Student 360
- [x] student/family/enrollment 聚合
- [x] homework/growth/attendance/billing 摘要位接真实仓储
- [x] recentTimeline 接真实数据源
- [ ] Student 360 Web 页面（WBS-015 / T-M1-FE-3）
- [ ] Web 不再前端手拼摘要

#### IMPL-002-3 文件主链路
- [ ] upload -> fileId -> submission 真闭环
- [ ] 前端上传后真实回写 fileId

### 当前判断
- 后端主数据已能用
- 最大缺口在 Web 联调与正式数据库迁移

---

## W3｜教学主链路真化（homework / growth）

### 目标
跑通：`submission -> analyze -> review -> observation -> goal -> report draft/publish`

### Agent
- A3：API 守门
- A6：homework/growth 后端
- A9：业务前端联调
- A10：E2E

### 任务

#### IMPL-003 Homework
- [x] submission / submission_files 持久化
- [x] fileIds 校验接真实 file assets
- [x] analyze 接 jobs
- [x] review / review_error_items 持久化事务
- [x] review draft 保存接口（若保留）
- [x] HomeworkReviewed outbox / event bus
- [ ] 真实 provider 配置边界
- [x] error taxonomy CRUD 后端能力

> 2026-03-25 A6 第二波：已在 `apps/api` 落 review draft 读写接口（`GET/PUT /homework/submissions/:submissionId/review-draft`），草稿持久化到 `apps/api/.data/homework.json`；`HomeworkSubmitted/HomeworkReviewed` 改为写入同文件 outbox 基础队列，支持重启后追踪；并补 `GET/POST/PATCH/DELETE /homework/error-taxonomies` 词典 CRUD 与“被 review 引用不可删”保护。顺手修复了现存 typecheck/test 红灯：`GrowthRepository.updateReport` 返回值、`teacher-002` 默认样本、growth reports 页面类型错误。- [ ] homework 页面接真接口
- [ ] review workbench 真 detail + 动作闭环

#### IMPL-004 Growth
- [x] rubrics / observations / goals / check-ins / reports 持久化
- [x] report draft job 接 jobs
- [x] report review / publish API
- [x] reportPublished 口径定版（以“是否已被 published report 的 materialRefs/growthObservations 引用”作为派生口径）
- [ ] materials assembler 去 placeholder
- [ ] growth 页面接真接口
- [ ] report draft job 异步态前后端联通
- 2026-03-25：已补 `GET /growth/reports/:reportId`、`POST /growth/reports/:reportId/review`、`POST /growth/reports/:reportId/publish`，后端状态流转固定为 `draft -> reviewed -> published`；review/publish workflow 先写入 `summaryJson.workflow`，保持当前 schema 与 JSON 持久化架构不破。

### 当前判断
- 后端主链路能跑
- 仍未进入“可运营状态”，因为 publish/outbox/provider/前端联调还没收口

---

## W4｜经营与运营真化（billing / communication / attendance / analytics）

### 目标
把收费、沟通、出勤、分析推到可运营。

### Agent
- A2：口径守门
- A6：attendance
- A7：billing/communication/analytics
- A9：业务前端
- A10：回归验证

### 任务

#### IMPL-005 Billing
- [x] products/contracts/invoices/payments/refunds/renewals 持久化
- [x] payment/refund 事务与 invoice 状态回写
- [ ] billing_adjustments 决策与实现
- [ ] billing 页面接真接口

#### IMPL-005 Communication
- [x] records/templates/message_tasks 持久化
- [x] sent/failed/read 状态链路
- [ ] 真渠道发送 adapter
- [ ] communication 页面接真接口

#### IMPL-005 Attendance
- [x] devices/bindings/events/sessions/dailyStats 持久化
- [x] active binding / dedupe / daily stats 再生
- [ ] 数据库级唯一性 / 幂等约束
- [ ] 真设备 ingestion / 接入链路
- [ ] attendance 页面接真接口

#### IMPL-005 Analytics
- [x] overview/teaching/billing 仓储聚合
- [ ] 指标口径文档与实现完全对齐
- [ ] analytics 页面接真接口

### 当前判断
- 后端经营模块比文档写得更靠前
- 但 Web 仍大面积 mock，口径文档治理也没收口

---

## W5｜migration / QA / release 真化（核心硬骨头）

### 目标
把“能开发”推到“能上线”。

### Agent
- A2：迁移映射与字段守门
- A3：接口/错误体守门
- A10：migration / QA / pre-prod / rollback 主导
- A1：go/no-go 签收

### 任务

#### IMPL-006 Migration
- [x] 真 Excel/CSV parser（当前已支持 `run-staging-import.mjs --csv/--json/--input` 读取文件输入，保留 mock fallback；Excel 原生 `.xlsx` 仍待接入）
- [ ] staging schema
- [ ] final load / upsert
- [x] 第一批真实样本导入（已补 `scripts/migration/fixtures/staging-import-sample.csv` 可跑 dry-run 样本）
- [ ] 正式 validation report

#### IMPL-006 QA
- [x] skeleton E2E -> executable E2E（auth/enrollment/homework/growth/billing 均补到可执行断言，不再只挂 todo）
- [x] 主流程 smoke 机器化（`apps/api/test/qa` 已覆盖 refresh rotation、Student360 查询、作业 job/result、growth report job、billing 幂等与超额保护）
- [ ] 缺陷单 / triage / 回归报告

#### IMPL-006 Release
- [ ] 预发环境校验
- [ ] 备份演练
- [ ] 恢复演练
- [ ] 回滚演练
- [ ] go / no-go 签收

### 当前判断
- 文档齐
- migration 已从“只会吃内置 mock”推进到“可吃 CSV/JSON 文件 dry-run”，但 `.xlsx` 原生解析、staging schema、final load 还没接上
- QA 已把主流程 skeleton 收口成可执行断言，能先兜住 auth / 主数据 / homework / growth / billing 的最小回归
- 真联调、真预发、回滚演练仍是下一阶段硬骨头

---

## 2. Agent 职责

| Agent | 职责 | 当前重点 |
|---|---|---|
| A1 | 范围/优先级/验收拍板 | 首发边界、go/no-go |
| A2 | DDL/字段/状态机守门 | 真 DB migration、指标口径 |
| A3 | API/OpenAPI/错误体守门 | growth publish、jobs、错误体 |
| A4 | auth/files/jobs/基础设施 | 守卫接线、S3、jobs worker |
| A5 | teachers/students/families/student360 | 正式 DB 与前端联调 |
| A6 | homework/growth/attendance | publish/outbox/provider/attendance 硬化 |
| A7 | billing/communication/analytics | adjustments、渠道、口径治理 |
| A8 | 主数据前端 | Student360、权限真接入 |
| A9 | 业务前端 | homework/growth/billing/attendance/analytics 去 mock |
| A10 | migration/QA/release | 真导入、真 E2E、预发回滚 |

---

## 3. 核心依赖关系

### 总前置
- DDL / OpenAPI / 字段口径是实现真源
- 真 DB / 真对象存储 / 真队列是实装总底座

### 关键链路
- files -> homework submission -> analyze -> review
- growth observation -> goal -> report draft -> publish
- contract -> invoice -> payment -> refund
- attendance device -> binding -> event -> daily stats
- homework/growth/billing/attendance -> analytics
- 主数据稳定 -> migration final load -> QA -> release

---

## 4. 统一 DoD

### 全局 DoD
1. [ ] lint / typecheck / test 通过
2. [ ] 文档/契约同步
3. [ ] 无字段漂移/状态机漂移
4. [ ] 交接清楚
5. [ ] 已进主线或有 commit 可追溯

### 实装期 DoD
1. [ ] 不再依赖 in-memory repository
2. [ ] 有真实数据表/migration/seed/接入方案
3. [ ] 有集成测试或可运行 smoke
4. [ ] 前后端已联调
5. [ ] 文档/契约同步
6. [ ] QA 可接手

### 上线期 DoD
1. [ ] 真实样本导入通过
2. [ ] P0/P1 缺陷清零
3. [ ] 主流程 E2E 通过
4. [ ] 预发可发布可回滚
5. [ ] Go / No-Go 可签收

---

## 5. 当前立刻执行（Now）

### NOW-A｜A4 基础设施接线
- [ ] 把 `ApiAuthGuard` / `PermissionGuard` 真挂到主要控制器
- [x] Web 去掉 `mockCurrentUser` 入口，改接共享 current-user source（优先 `/auth/me`，无 token 时 dev bootstrap login fallback）

### NOW-B｜A8/A9 Web 去 mock
- [x] 先打通 homework submissions/review 真接口
- [x] 再打通 growth reports/observations/goals 真接口
- [x] 再接 billing/contracts/invoices 与 analytics overview
- [~] billing products/renewals、analytics billing/teaching 也已顺手接真接口；payments/refunds/adjustments 详情聚合因后端未给列表接口，暂保留占位块
- [~] growth rubrics 详情与列表已接真接口；report publish / report review 因后端 API 未落地，编辑/发布动作仍为前端骨架

### NOW-C｜A3/A6 教学闭环收口
- [x] growth report review/publish 契约与实现
- [ ] homework review draft / outbox 决策与实现

### NOW-D｜A10 真导入与真联调
- [~] migration 脚本去掉 mock source rows（已支持外部 CSV/JSON 输入；默认 mock fallback 暂保留给 dry-run 样本）
- [~] 补真实 parser / staging / upsert（parser 已补，staging/upsert 仍待接正式库）
- [x] 把 QA 里 todo case 改成 executable assertions

---

## 6. 本文件与其他文档的关系

- 本文件：唯一主控盘 / 默认更新点
- `15`：协作总设计
- `16`：细粒度派工台账
- `17`：联调与验收检查项
- `20/21/23/24`：守门依据
- `25/26/27`：迁移/预发专题材料
- `28`：实装阶段专项清单

后续原则：
- **进度先回写本文件**
- 专题细节再落到对应专题文档

---

## 7. 最后一锤

**系统现在最缺的不是更多页面，也不是更多规划文档，而是三根真主线：真鉴权、真前端联调、真迁移。**

这三根拧紧，房子才开始挡风；不然只是样板间灯打得亮。 
