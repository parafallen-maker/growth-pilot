# 43 QA-29/QA-31/QA-32 性能基准与发布后观察运行手册

> 覆盖范围：`QA-29`、`QA-31`、`QA-32`
>
> 用途：把性能基准、上线后 24h 监控、上线后 72h 稳定性确认固化成同一套可执行 runbook、阈值表、取证标准。
>
> 状态声明：本文交付执行方法、表格和升级路径，不代表真实 UAT / 生产观察已经完成。

---

## 1. 使用顺序

1. 发布前 1 个工作日准备 `performance_benchmark_sheet_template.md`
2. 在 UAT 或预发布环境执行 `QA-29`，保留原始压测结果和截图
3. 发布当天创建 `go_live_observation_log_template.md`
4. 若出现故障，立即复制 `incident_evidence_template.md` 建立单独事件记录
5. T+72h 窗口结束后，把结论汇总到 `release_acceptance_report_template.md`

关联模板：
- `docs/growthpilot/templates/performance_benchmark_sheet_template.md`
- `docs/growthpilot/templates/go_live_observation_log_template.md`
- `docs/growthpilot/templates/incident_evidence_template.md`
- `docs/growthpilot/templates/release_acceptance_report_template.md`

建议证据目录：

```text
docs/growthpilot/artifacts/releases/<release-id>/
  qa-29/
    benchmark-sheet.md
    load-raw/
    screenshots/
    db/
    infra/
  qa-31/
    go-live-observation.md
    incidents/
    logs/
    metrics/
  qa-32/
    stability-summary.md
    backup/
    user-feedback/
```

---

## 2. 角色与职责

| Role | Responsibility | Minimum SLA |
|---|---|---|
| Release Commander | 观察窗口总指挥、升级决策、Go/No-Go / rollback 决策 | P0/P1 触发后 5 分钟内响应 |
| QA Owner | 执行 benchmark、记录 observation、校验证据完整性 | 指令下达后 10 分钟内更新日志 |
| API Owner | API、DB、worker、慢查询排查与缓解 | P0/P1 触发后 10 分钟内到场 |
| Web Owner | 首页加载、登录、SSR、前端错误排查 | P0/P1 触发后 10 分钟内到场 |
| Ops Owner | 主机、容器、网络、磁盘、备份、监控系统 | P0/P1 触发后 10 分钟内到场 |
| Business Owner | 决定条件放行、停机公告、用户沟通口径 | P1 升级后 15 分钟内确认 |

联系人姓名、电话、IM 以 `docs/growthpilot/41_运维手册.md` 为准。

---

## 3. `QA-29` 性能基准测试

### 3.1 进入条件

全部满足后才允许开始 benchmark：
- 发布候选 commit 已冻结，API / Web 镜像或构建产物与待发布版本一致
- 测试环境连接真实 PostgreSQL，数据量至少达到首发预计生产量的 `30%`
- `.env`、连接池、对象存储、Redis 配置与目标环境一致，允许的差异只能是域名和密钥
- 压测窗口内禁止执行大批量数据导入、DDL、备份恢复演练
- `health`、`health/ready` 连续 5 分钟稳定为 `200`

### 3.2 标准场景

| Scenario ID | Scenario | Endpoint / Action | User Role | Success Rule |
|---|---|---|---|---|
| `WEB-01` | 首页加载 | 打开 `/` 并完成首屏渲染 | anonymous | 页面可交互，浏览器无 fatal error |
| `API-01` | 登录后学生列表 | `GET /students?pageNo=1&pageSize=20` | teacher | 返回 `200` 且 `items.length >= 1` |
| `API-02` | 学生 360 | `GET /students/{id}/360` | teacher | 返回 `200` 且含 summary blocks |
| `API-03` | 作业列表 | `GET /homework/submissions?pageNo=1&pageSize=20` | teacher | 返回 `200` |
| `API-04` | 经营总览 | `GET /analytics/overview` | principal | 返回 `200` |
| `UPLOAD-01` | 10MB 文件上传 | `POST /files/upload/multipart` | teacher | 返回 `201/200` 且获得 `fileId` |

如果环境无法覆盖全部 6 个场景，必须写明缺失原因，不得自动视为通过。

### 3.3 测试阶段与采样

| Stage | Purpose | Concurrency | Duration / Sample Count | Pass Condition |
|---|---|---|---|---|
| `warm-up` | 清缓存、预热连接池 | 1 user | 3 分钟 | 无 5xx、无 readiness 失败 |
| `ramp-10` | 低并发校验 | 10 users | 5 分钟 | 失败率 `< 0.5%` |
| `ramp-25` | 中并发校验 | 25 users | 10 分钟 | 失败率 `< 1%` |
| `steady-50` | 主基准阶段 | 50 users | 15 分钟 | 满足阈值表 |
| `upload-sample` | 上传链路单独测 | 10 parallel uploads | 至少 20 次上传 | 满足上传阈值 |

采样要求：
- API 响应时间使用压测工具原始结果，至少保留 `p50/p95/p99/error rate/RPS`
- 首页加载时间至少保留 20 次样本，记录 `LCP` 或等效首屏完成时间
- DB 连接数、CPU、Memory、Disk 每 1 分钟记录一次
- 慢查询每个阶段至少抓取 1 次 Top 10

### 3.4 阈值表

| Metric | Green | Amber | Red | Action |
|---|---|---|---|---|
| 首页加载 P95 | `<= 3.0s` | `> 3.0s` 且 `<= 4.5s` | `> 4.5s` | Amber 需复测 1 次；Red 直接阻断发布 |
| API 列表查询 P95 | `<= 300ms` | `> 300ms` 且 `<= 450ms` | `> 450ms` | Amber 需定位热点接口；Red 阻断发布 |
| API 列表查询 P99 | `<= 500ms` | `> 500ms` 且 `<= 800ms` | `> 800ms` | 连续两轮 Amber 视为 fail |
| API 失败率 | `< 1.0%` | `>= 1.0%` 且 `< 2.0%` | `>= 2.0%` | Red 阻断发布 |
| 10MB 上传 P95 | `<= 5.0s` | `> 5.0s` 且 `<= 8.0s` | `> 8.0s` | Amber 需检查存储和反代限制 |
| DB 活跃连接占池上限 | `< 70%` | `>= 70%` 且 `< 80%` | `>= 80%` | Red 需立刻限流或回滚 |
| 慢查询数量（>1s） | `0~2 / 15min` | `3~5 / 15min` | `> 5 / 15min` 或单条 `> 5s` | Red 必须定位 SQL/索引 |
| API 进程 RSS | `< 75%` 宿主机内存 | `>= 75%` 且 `< 85%` | `>= 85%` | Red 需扩容或回滚 |
| 磁盘使用率 | `< 75%` | `>= 75%` 且 `< 80%` | `>= 80%` | Red 不允许继续放量 |

### 3.5 记录命令模板

以下命令仅作为证据采集样例，真实域名、容器名以目标环境为准：

```bash
curl -fsS "$API_BASE_URL/health"
curl -fsS "$API_BASE_URL/health/ready"
docker compose -f docker-compose.prod.yml logs api --since=15m
docker stats --no-stream api web db redis
```

PostgreSQL 连接数：

```sql
SELECT count(*) AS active_connections
FROM pg_stat_activity
WHERE datname = current_database()
  AND state <> 'idle';
```

若已启用 `pg_stat_statements`，抓取慢查询 Top 10：

```sql
SELECT queryid,
       calls,
       round(mean_exec_time::numeric, 2) AS mean_ms,
       round(max_exec_time::numeric, 2) AS max_ms
FROM pg_stat_statements
ORDER BY max_exec_time DESC
LIMIT 10;
```

若未启用 `pg_stat_statements`，改为保留数据库日志中的慢查询片段，并在 measurement sheet 里写清采集方式。

### 3.6 基准结论规则

以下任一条件成立，则 `QA-29` 不得标完成：
- 任一核心场景缺失有效结果
- 任一关键指标触发 Red
- 同一指标在复测后仍为 Amber
- 证据目录缺失原始结果、截图或 DB / infra 采样

允许标 `[/]` 的情况：
- runbook、阈值、测量表、取证模板已就绪
- 但尚未在真实 UAT / 预发布环境执行完整基准

---

## 4. `QA-31` 上线后 24h 监控

### 4.1 观察班表与节奏

| Window | Cadence | Required Roles |
|---|---|---|
| `T+0h ~ T+1h` | 每 15 分钟记录一次 | Commander、QA、API、Web、Ops |
| `T+1h ~ T+6h` | 每 30 分钟记录一次 | QA、API、Ops |
| `T+6h ~ T+24h` | 每 60 分钟记录一次 | QA、Ops，必要时拉 API / Web |

每次记录必须包含：
- 当前时间、值班人、采样来源
- API error rate、API P95、首页加载时间
- DB 活跃连接数、慢查询概况
- CPU、Memory、Disk
- 是否出现权限越权、金额异常、重复数据、上传失败

### 4.2 24h 阈值表

| Metric | Green | Amber | Red | Response |
|---|---|---|---|---|
| API 5xx rate（5 分钟窗口） | `< 0.5%` | `>= 0.5%` 且 `< 1.0%` | `>= 1.0%` | Red 立即拉起事件 |
| API P95（5 分钟窗口） | `<= 350ms` | `> 350ms` 且 `<= 500ms` | `> 500ms` | 连续 2 个窗口 Red 进入 rollback 评估 |
| 首页加载 P95 | `<= 3.0s` | `> 3.0s` 且 `<= 4.0s` | `> 4.0s` | Red 通知 Web Owner |
| `health/ready` | 全部成功 | 单次失败 | 连续 3 次失败 | 连续 3 次失败视为 P0 |
| DB 活跃连接占池上限 | `< 70%` | `>= 70%` 且 `< 80%` | `>= 80%` | Red 通知 API + Ops |
| 慢查询（>1s） | `0~2 / h` | `3~5 / h` | `> 5 / h` 或单条 `> 5s` | Red 需开事件记录 |
| 磁盘使用率 | `< 75%` | `>= 75%` 且 `< 80%` | `>= 80%` | Red 需处理日志/备份空间 |
| API / Web 容器重启次数 | `0` | `1 / 24h` | `>= 2 / 24h` | Red 进入故障排查 |

### 4.3 24h 事件分级

| Severity | Definition | Example | Required Action |
|---|---|---|---|
| `P0` | 核心功能不可用或数据完整性受损 | 无法登录、金额重复扣减、全站 5xx | 5 分钟内升级到 Commander，优先 rollback |
| `P1` | 主要功能显著退化，影响可控但持续存在 | 学生列表大量超时、上传失败率升高 | 10 分钟内拉齐负责人，30 分钟内给出缓解方案 |
| `P2` | 局部功能异常，有绕行方案 | 单页面加载变慢、个别报表异常 | 记录 defect，24h 内修复计划 |
| `P3` | 不影响首发目标的小问题 | 样式错位、单条日志噪音 | 进入 backlog |

### 4.4 24h 升级树

```text
发现告警 / 用户投诉 / 观察日志异常
  -> QA Owner 在 5 分钟内记录 observation 与 incident
  -> 根据严重级别通知 Release Commander
     -> P0: Commander + API + Web + Ops + Business Owner 全员到场
     -> P1: Commander + 相关技术负责人 + Ops 到场
     -> P2/P3: 记录 defect，按值班链路跟进
  -> 15 分钟内给出：
     1. 影响范围
     2. 临时缓解
     3. 是否进入 rollback 评估
  -> 30 分钟内更新一次事件状态，直到关闭
```

### 4.5 24h 取证要求

每次 Red 或 P0/P1 事件至少收集：
- 错误日志片段，覆盖事件前后各 10 分钟
- 对应 requestId / traceId / userId / batchId
- 监控截图或导出数据，含时间范围
- DB 连接数、慢查询、容器资源快照
- 用户影响描述和客服/业务反馈
- 临时缓解动作与执行时间

未形成取证包的事件，不得记为“已恢复”。

---

## 5. `QA-32` 上线后 72h 稳定性确认

### 5.1 观察节奏

| Window | Cadence | Focus |
|---|---|---|
| `T+24h ~ T+48h` | 每 4 小时 | 资源趋势、错误回落、重复告警 |
| `T+48h ~ T+72h` | 每 6 小时 | 备份成功率、用户反馈、未关闭缺陷 |

### 5.2 72h 必答项

发布满 72 小时后，必须回答并留证：
1. 是否仍存在未关闭 `P0/P1`
2. 所有计划内备份是否连续成功
3. 是否出现系统性投诉或重复故障
4. 监控阈值是否需要调优，是否存在大量误报
5. 是否存在需立即纳入下一波修复的 `P2`

### 5.3 72h 通过标准

| Check | Pass Rule | Fail Rule |
|---|---|---|
| P0/P1 缺陷 | `0` 个未关闭 | 任意未关闭即 fail |
| 备份任务 | 观察窗口内所有计划内备份成功；若按天执行，则 `3/3` 成功 | 任意一次失败未闭环 |
| 回滚准备 | 回滚脚本和备份仍可用，关键联系人仍在线 | 发现回滚资产缺失 |
| 用户反馈 | 无系统性投诉；同类高频投诉 `< 3` 起 | 同类严重投诉 `>= 3` 起或持续升级 |
| 告警噪音 | 无持续误报，或误报已有清理动作与 owner | 高频误报无人处理 |
| 性能趋势 | API P95、首页加载、DB 连接数未较 T+24h 恶化 `> 20%` | 任一关键指标恶化 `> 20%` 且无解释 |

### 5.4 72h 收尾动作

1. QA 汇总 24h/72h observation、incident、backup、user feedback 证据
2. Commander 召开稳定性确认会，输出 `stable / conditional / unstable`
3. 结论写入 `release_acceptance_report_template.md`
4. 若结论不是 `stable`，不得关闭发布观察窗口

---

## 6. 回滚评估触发器

满足以下任一项，必须召开 rollback 评估：
- `health/ready` 连续 3 次失败且 15 分钟内无法恢复
- 核心链路出现 `P0`
- 同一核心接口 30 分钟内连续 2 个窗口 `API P95 > 500ms`
- 出现数据一致性问题：重复扣款、重复写入、数据丢失、权限越权
- 上传、登录、学生列表、账单等首发核心流程中任意 2 条同时不可用

rollback 评估会必须记录：
- 当前版本 / commit
- 影响面
- 已做缓解动作
- rollback 预计耗时
- 业务确认结论

---

## 7. 证据完整性检查表

| Evidence Type | QA-29 | QA-31 | QA-32 |
|---|---|---|---|
| 原始结果文件 / 导出数据 | required | required | optional |
| 截图（监控 / 页面 / 错误） | required | required | required |
| 日志片段 | required | required | required |
| DB 查询结果 | required | required | required |
| Docker / host 资源快照 | required | required | required |
| 负责人签名 / 时间戳 | required | required | required |
| 事件时间线 | optional | required | required |

任意一列存在 `required` 未补齐时，对应任务只能维持 `[/]`。
