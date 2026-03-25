# 30 analytics 指标口径与实现对齐

> 范围：仅覆盖当前仓库内 `apps/api/src/modules/analytics/service/analytics.service.ts` 已落地的 repo-internal 聚合口径。
> 不含：正式 PostgreSQL/BI 快照表、跨服务埋点、导出中心、Redis/BullMQ 异步刷新。

---

## 1. 当前结论

当前 `analytics` 已不是纯 mock。
后端三类接口：
- `GET /analytics/overview`
- `GET /analytics/teaching`
- `GET /analytics/billing`

均已直接读取仓库内真实持久化仓储：
- billing
- communication
- attendance
- homework

一句话：**口径已在 repo 内对齐，底座仍不是正式 BI。**

---

## 2. 数据源边界

| 看板 | 当前数据源 | 说明 |
|---|---|---|
| overview | contracts / invoices / payments / homework submissions / attendance events / communication records / message tasks / renewals | 仓库内实时聚合，不走快照 |
| teaching | homework submissions / homework time daily stats / communication records | 老师负载、学科正确率、错因分布、作业时长覆盖 |
| billing | contracts / invoices / payments / refunds / renewals / communication records / message tasks | 收款趋势、应收趋势、续费漏斗、沟通触达 |

当前统一筛选参数：
- `campusId`
- `termId`
- `dateFrom`
- `dateTo`
- `teacherId`（仅 teaching）

---

## 3. 已实现口径

### 3.1 overview

| 指标 | 当前实现 | 代码口径 |
|---|---|---|
| `activeStudentCount` | 已实现 | `contracts.status === 'active'` 的去重学生数 |
| `pendingHomeworkCount` | 已实现 | `reviewStatus in ('unreviewed','reviewing')` 的 submission 数 |
| `reportPublishRate` | 已实现 | `reviewStatus in ('reviewed','published') / homework submissions 总数` |
| `receivableCents` | 已实现 | scope 内 invoices `amountCents` 求和 |
| `receivedCents` | 已实现 | scope 内 `payments.status === 'success'` 的 `paidAmountCents` 求和 |
| `todayAttendanceAnomalyCount` | 已实现 | 同一学生同一天若未同时出现 `checkin + checkout`，记为异常 1 次 |
| `trend.renewalTodoCount` | 已实现 | renewals 中 `status === 'todo'` 数量 |
| `trend.communicationTouchCount` | 已实现 | communication records 数量 |
| `trend.messageFailureCount` | 已实现 | message tasks 中 `status === 'failed'` 数量 |

### 3.2 teaching

| 指标 | 当前实现 | 代码口径 |
|---|---|---|
| `teacherWorkloads[].pendingReviewCount` | 已实现 | 该老师名下 `unreviewed/reviewing` submission 数 |
| `teacherWorkloads[].activeStudentCount` | 已实现 | 该老师 submission 去重学生数 |
| `teacherWorkloads[].communicationCount` | 已实现 | 与该老师学生集合相交的 communication records 数 |
| `subjectAccuracy[]` | 已实现 | homework `finalAccuracyPct` 按 subject 平均 |
| `topErrors[]` | 已实现 | `finalErrorSummary` 按 `、,，空白` 分词计数 Top 5 |
| `growthCoverage[]` | 已实现 | attendance `homework time daily stats` 按 subject 汇总总分钟与 sessionCount |

### 3.3 billing

| 指标 | 当前实现 | 代码口径 |
|---|---|---|
| `receivableTrend[]` | 已实现 | invoices 按 `issueDate` 聚合 `amountCents` |
| `receivedTrend[]` | 已实现 | success payments 按 `paymentTime` 日期聚合 `paidAmountCents` |
| `agingSummary[].outstandingCents` | 已实现 | invoice 金额减去 payment 成功金额，再扣 refund |
| `agingSummary[].invoiceCount` | 已实现 | 仍有未收余额的 invoice 数 |
| `renewalFunnel[]` | 已实现 | `todo/contacting/won/lost/closed` 五态计数 |
| `communicationTouchCount` | 已实现 | communication records 数量 |
| `messageTaskCount` | 已实现 | message tasks 数量 |

---

## 4. 已补测试锚点

已用 `apps/api/test/analytics.test.ts` 锚住以下 repo-internal 口径：
- `overview.receivableCents`
- `overview.receivedCents`
- `overview.reportPublishRate`
- `overview.todayAttendanceAnomalyCount`
- `overview.trend.renewalTodoCount`
- `billing.receivableTrend`
- `teaching.subjectAccuracy`
- `teaching.dataSource.mode === 'repository-aggregated'`

这意味着后续再改口径，测试会先响。

---

## 5. 明确未完成项（外部依赖）

以下仍不能在本仓库内自称“完成”：

1. **正式 BI 快照表**
   - `kpi_daily_snapshots` 仍未接真实 DB 写入/回刷。
2. **异步刷新任务**
   - 还没有 Redis/BullMQ worker 去做夜间聚合刷新。
3. **导出/报表中心**
   - 页面导出、定时报表、归档未落。
4. **跨系统数据校对**
   - 当前只保证 repo 内口径一致，不代表与外部财务系统/正式学籍库已对账。

结论：
- **repo-internal 口径治理：可打勾**
- **正式 BI 工程化：不能冒充完成**

---

## 6. 对 29 号总 Todo 的回写建议

`IMPL-005 Analytics` 建议拆成两层描述：
- 已完成：repo-internal 指标口径文档与实现对齐
- 未完成：正式 DB/BI 快照/异步刷新/前端全量验收

文档要说真话。真话最省返工。
