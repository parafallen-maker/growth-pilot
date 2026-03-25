# Go-Live Observation Log

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- commander: `<fill-me>`
- scribe: `<fill-me>`

## T+0h Checklist

| Time | Check | Result | Evidence | Owner |
|---|---|---|---|---|
| <HH:mm> | `/health` = 200 | pending | <link/path> | <fill-me> |
| <HH:mm> | `/health/ready` = 200 | pending | <link/path> | <fill-me> |
| <HH:mm> | `go_live_smoke_checklist_template.md` 已执行完毕 | pending | <link/path> | <fill-me> |
| <HH:mm> | 首页加载 | pending | <link/path> | <fill-me> |
| <HH:mm> | 登录与 `/auth/me` | pending | <link/path> | <fill-me> |
| <HH:mm> | 学生列表可见迁移数据 | pending | <link/path> | <fill-me> |
| <HH:mm> | 作业上传与下载 | pending | <link/path> | <fill-me> |

## T+24h Observation

| Metric | Threshold | Observed | Status | Notes |
|---|---|---|---|---|
| API error rate | `< 1%` | pending | pending | |
| API P95 | `< 300ms` | pending | pending | |
| Home page load | `< 3s` | pending | pending | |
| Disk usage | `< 80%` | pending | pending | |
| DB connections | within cap | pending | pending | |

## T+72h Stability

| Check | Result | Evidence | Owner |
|---|---|---|---|
| 无 P0/P1 未关闭缺陷 | pending | <fill-me> | <fill-me> |
| 备份任务正常执行 | pending | <fill-me> | <fill-me> |
| 监控告警误报已清理 | pending | <fill-me> | <fill-me> |
| 用户反馈已汇总 | pending | <fill-me> | <fill-me> |

## Incident Notes

- `<timestamp>` `<summary>`
