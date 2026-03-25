# Production DB Initialization Checklist

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- operator: `<fill-me>`
- db_instance: `<fill-me>`
- backup_label: `<fill-me>`

## 1. Preconditions

| Item | Expected | Result | Evidence | Owner |
|---|---|---|---|---|
| `release-gate.yaml` 已批准 | final_decision = go | pending | `<path>` | `<fill-me>` |
| 生产 env 校验通过 | `ops:env:check --mode prod` | pending | `<path>` | `<fill-me>` |
| 数据库备份已完成 | `.sql.gz` 可定位 | pending | `<path>` | `<fill-me>` |
| 回滚负责人在线 | 名字与联系方式已登记 | pending | `<fill-me>` | `<fill-me>` |
| 维护窗口开始 | 时间已确认 | pending | `<fill-me>` | `<fill-me>` |

## 2. Execution Log

| Step | Command | Start | End | Exit Code | Evidence | Notes |
|---|---|---|---|---|---|---|
| existence-check | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | |
| create-db | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | 如已存在则写 `skipped` |
| db-migrate | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | |
| db-seed | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | |
| post-check | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<fill-me>` | `<path>` | |

## 3. Verification

| Check | Expected | Result | Evidence |
|---|---|---|---|
| 数据库存在 | `growthpilot` 可连接 | pending | `<path>` |
| migration 完成 | 无失败 migration | pending | `<path>` |
| seed 输出 | campuses/roles/users/terms/dictionaries 写入成功 | pending | `<path>` |
| 基线账号可登录 | `admin` 至少可登录 API | pending | `<path>` |

## 4. Rollback

| Trigger | Action | Owner | Evidence |
|---|---|---|---|
| create-db / migrate 失败 | 立即停止后续步骤，保留日志，按需恢复备份 | `<fill-me>` | `<path>` |
| seed 异常且尚未开放写流量 | 优先恢复数据库备份或重建空库后重跑 | `<fill-me>` | `<path>` |
| post-check 不通过 | 不进入迁移或部署步骤 | `<fill-me>` | `<path>` |

## 5. Signoff

| Role | Name | Decision | Timestamp |
|---|---|---|---|
| DB Operator | `<fill-me>` | pending | `<fill-me>` |
| Tech Owner | `<fill-me>` | pending | `<fill-me>` |
| QA / Release | `<fill-me>` | pending | `<fill-me>` |
