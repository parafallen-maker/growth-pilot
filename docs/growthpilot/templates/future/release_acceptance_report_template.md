# 发布验收报告

> 用途：正式上线并完成观察窗口后，由 QA / PM / Owner 联合签发。
>
> 状态约束：如果还没有真实上线数据，只能标记为 `draft` 或 `partial`，不能写成最终验收结论。

- document_status: `draft`
- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- version: `<fill-me>`
- release_commit: `<fill-me>`
- release_time: `<YYYY-MM-DD HH:mm:ss +08:00>`
- released_by: `<fill-me>`
- qa_owner: `<fill-me>`
- pm_owner: `<fill-me>`
- tech_owner: `<fill-me>`

## 1. 发布范围

### 1.1 本次发布包含

- `<fill-me>`
- `<fill-me>`
- `<fill-me>`

### 1.2 本次发布不包含

- `<fill-me>`
- `<fill-me>`

## 2. 发布前入口条件

| Item | Result | Evidence | Owner |
|---|---|---|---|
| Go/No-Go 检查完成 | pending | <fill-me> | <fill-me> |
| 环境变量校验完成 | pending | <fill-me> | <fill-me> |
| 备份与回滚路径确认 | pending | <fill-me> | <fill-me> |
| UAT 签收完成 | pending | <fill-me> | <fill-me> |
| UAT blocker 清零 | pending | <fill-me> | <fill-me> |

## 3. 执行摘要

| Item | Result | Evidence | Notes |
|---|---|---|---|
| 生产数据库初始化 | pending | <fill-me> | |
| 生产迁移 | pending | <fill-me> | |
| 首次部署 | pending | <fill-me> | |
| 上线冒烟 | pending | <fill-me> | |
| T+24h 监控 | pending | <fill-me> | |
| T+72h 稳定性 | pending | <fill-me> | |

## 4. 时间线

| Time | Event | Owner | Result | Evidence |
|---|---|---|---|---|
| <HH:mm> | Go/No-Go 会签 | <fill-me> | pending | <fill-me> |
| <HH:mm> | 备份完成 | <fill-me> | pending | <fill-me> |
| <HH:mm> | 开始部署 | <fill-me> | pending | <fill-me> |
| <HH:mm> | 冒烟完成 | <fill-me> | pending | <fill-me> |
| <HH:mm> | T+24h 复核 | <fill-me> | pending | <fill-me> |
| <HH:mm> | T+72h 复核 | <fill-me> | pending | <fill-me> |

## 5. UAT 与缺陷摘要

### 5.1 UAT 结论

- UAT 决策：`pending`
- UAT 执行记录：`<path/link>`
- UAT 业务签收：`<path/link>`

### 5.2 缺陷统计

| Level | Open | Closed | Deferred | Notes |
|---|---|---|---|---|
| P0 | 0 | 0 | 0 | |
| P1 | 0 | 0 | 0 | |
| P2 | 0 | 0 | 0 | |
| P3 | 0 | 0 | 0 | |

### 5.3 已知限制

- `<fill-me>`
- `<fill-me>`

## 6. 观察窗口结果

| Metric | Target | Observed | Status | Evidence |
|---|---|---|---|---|
| API error rate | `< 1%` | pending | pending | <fill-me> |
| API P95 | `< 300ms` | pending | pending | <fill-me> |
| Home page load | `< 3s` | pending | pending | <fill-me> |
| Disk usage | `< 80%` | pending | pending | <fill-me> |
| DB connections | within cap | pending | pending | <fill-me> |

## 7. 风险与后续动作

### 7.1 剩余风险

- `<fill-me>`
- `<fill-me>`

### 7.2 后续迭代计划

1. `<fill-me>`
2. `<fill-me>`
3. `<fill-me>`

## 8. 最终结论

- 发布结论：`pending`
- 建议：`go / conditional-go / no-go`
- 结论说明：`<fill-me>`

## 9. 签收

| Role | Name | Decision | Timestamp | Notes |
|---|---|---|---|---|
| QA | <fill-me> | pending | <fill-me> | |
| PM | <fill-me> | pending | <fill-me> | |
| Owner | <fill-me> | pending | <fill-me> | |
