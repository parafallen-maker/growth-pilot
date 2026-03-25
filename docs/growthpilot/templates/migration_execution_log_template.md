# Migration Execution Log

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- migration_owner: `<fill-me>`
- reject_owner: `<fill-me>`
- commander: `<fill-me>`
- scribe: `<fill-me>`

## 1. Source Inventory

| Source File | SHA256 | Domain | Expected Rows | Owner | Notes |
|---|---|---|---|---|---|
| `<fill-me>` | `<fill-me>` | `students/families/homework/...` | `<fill-me>` | `<fill-me>` | |

## 2. Preflight Checklist

| Item | Result | Evidence | Owner |
|---|---|---|---|
| `ops:release:init` 已生成执行目录 | pending | `<path>` | `<fill-me>` |
| `ops:env:check` 已通过 | pending | `<path>` | `<fill-me>` |
| 执行前数据库备份已完成 | pending | `<path>` | `<fill-me>` |
| 输入文件 SHA256 已登记 | pending | `<path>` | `<fill-me>` |
| `release-gate.yaml` 已签字允许执行 | pending | `<path>` | `<fill-me>` |
| rollback owner 在线 | pending | `<fill-me>` | `<fill-me>` |

## 3. Command Timeline

| Step | Command | Start | End | Exit Code | Log | Result |
|---|---|---|---|---|---|---|
| report-only | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | pending |
| dry-run | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | pending |
| reject review | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | pending |
| db-apply | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | pending |

## 4. Reject Review

| Reject Code | Count | Owner | Disposition | Re-run Needed | Evidence |
|---|---|---|---|---|---|
| `<fill-me>` | `<fill-me>` | `<fill-me>` | `accept/reject/rework` | `yes/no` | `<path>` |

Blocking rules:
- `rejectedRows / rawRows >= 2%` 默认阻断。
- 出现 `CONFLICT_*`、金额不平、重复幂等键时默认阻断。
- 任何未分派 owner 的 reject 不得进入 `db-apply`。

## 5. Rollback Checkpoints

| Checkpoint | Trigger | Decision Owner | Recovery Action | Evidence |
|---|---|---|---|---|
| `before-report-only` | 输入文件与批次信息不一致 | `<fill-me>` | 停止执行并重新生成 source inventory | `<path>` |
| `before-db-apply` | reject 超阈值、env 校验失败、备份缺失 | `<fill-me>` | 不执行写库，保留 dry-run artifact | `<path>` |
| `after-db-apply` | 写入 staging 后发现批次错误 | `<fill-me>` | 走 `db:restore` 或按批准 SQL 删除该 `batch_id` staging 记录 | `<path>` |

## 6. Final Summary

| Metric | Value |
|---|---|
| rawRows | `<fill-me>` |
| normalizedRows | `<fill-me>` |
| readyToLoadRows | `<fill-me>` |
| rejectedRows | `<fill-me>` |
| readyDomains | `<fill-me>` |

## 7. Signoff

| Role | Name | Decision | Timestamp | Notes |
|---|---|---|---|---|
| Migration Owner | `<fill-me>` | pending | `<fill-me>` | |
| QA | `<fill-me>` | pending | `<fill-me>` | |
| PM / Business | `<fill-me>` | pending | `<fill-me>` | |
| Tech Owner | `<fill-me>` | pending | `<fill-me>` | |
