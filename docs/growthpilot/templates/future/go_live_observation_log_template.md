# Go-Live Observation Log

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- release_commit: `<fill-me>`
- commander: `<fill-me>`
- scribe: `<fill-me>`
- qa_owner: `<fill-me>`
- api_owner: `<fill-me>`
- web_owner: `<fill-me>`
- ops_owner: `<fill-me>`
- threshold_doc: `docs/growthpilot/43_QA29_QA31_QA32_性能基准与发布后观察运行手册.md`
- evidence_root: `docs/growthpilot/artifacts/releases/<release-id>/qa-31/`

## T+0h Checklist

| Time | Check | Result | Evidence | Owner |
|---|---|---|---|---|
| <HH:mm> | `/health` = 200 | pending | <link/path> | <fill-me> |
| <HH:mm> | `/health/ready` = 200 | pending | <link/path> | <fill-me> |
| <HH:mm> | 首页加载 | pending | <link/path> | <fill-me> |
| <HH:mm> | 登录与 `/auth/me` | pending | <link/path> | <fill-me> |
| <HH:mm> | 学生列表可见迁移数据 | pending | <link/path> | <fill-me> |
| <HH:mm> | 作业上传与下载 | pending | <link/path> | <fill-me> |

## T+24h Sampling Schedule

| Window | Cadence | Recorder | Notes |
|---|---|---|---|
| T+0h ~ T+1h | every 15m | QA + Ops | all metrics required |
| T+1h ~ T+6h | every 30m | QA | API / DB / infra snapshots |
| T+6h ~ T+24h | every 60m | QA / Ops | add user feedback summary |

## T+24h Observation

| Timestamp | Metric | Threshold | Observed | Status | Evidence | Notes |
|---|---|---|---|---|---|---|
| <MM-DD HH:mm> | API 5xx rate | `< 1.0%` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | API P95 | `<= 350ms` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | Home page P95 | `<= 3.0s` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | DB active connections | `< 70% pool cap` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | Slow queries >1s | `<= 2 / h` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | Disk usage | `< 80%` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | Memory RSS | `< 85% host memory` | pending | pending | <fill-me> | |
| <MM-DD HH:mm> | Container restarts | `0` | pending | pending | <fill-me> | |

## 24h Risk Checks

| Check | Result | Evidence | Owner | Notes |
|---|---|---|---|---|
| 权限越权投诉 | pending | <fill-me> | <fill-me> | |
| 金额异常 / 重复扣费 | pending | <fill-me> | <fill-me> | |
| 重复数据 / 数据丢失 | pending | <fill-me> | <fill-me> | |
| 文件上传失败异常升高 | pending | <fill-me> | <fill-me> | |
| 用户反馈已汇总 | pending | <fill-me> | <fill-me> | |

## Incident Escalation Log

| Time | Severity | Trigger | Decision | Commander | Incident File |
|---|---|---|---|---|---|
| <MM-DD HH:mm> | <P0/P1/P2/P3> | <fill-me> | <observe / mitigate / rollback-eval / rollback> | <fill-me> | <fill-me> |

## T+72h Stability

| Check | Pass Rule | Result | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 无 P0/P1 未关闭缺陷 | `0 open` | pending | <fill-me> | <fill-me> | |
| 备份任务正常执行 | all scheduled backups succeeded | pending | <fill-me> | <fill-me> | |
| 监控告警误报已清理 | no repeated noisy alerts | pending | <fill-me> | <fill-me> | |
| 用户反馈已汇总 | no systemic complaint trend | pending | <fill-me> | <fill-me> | |
| 核心性能未较 T+24h 恶化 >20% | compare to 24h baseline | pending | <fill-me> | <fill-me> | |
| 回滚资产仍可用 | scripts + backups available | pending | <fill-me> | <fill-me> | |

## Evidence Checklist

| Evidence | Path | Result |
|---|---|---|
| 24h metrics export | <fill-me> | pending |
| health / ready snapshots | <fill-me> | pending |
| API / Web / DB logs | <fill-me> | pending |
| Docker / host resource snapshots | <fill-me> | pending |
| Backup execution evidence | <fill-me> | pending |
| User feedback summary | <fill-me> | pending |
| Incident evidence files | <fill-me> | pending |

## Incident Notes

- `<timestamp>` `<summary>`
