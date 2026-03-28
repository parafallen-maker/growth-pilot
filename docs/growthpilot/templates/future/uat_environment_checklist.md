# UAT Environment Checklist

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- target_url: `<fill-me>`
- api_base_url: `<fill-me>`
- checked_by: `<fill-me>`

## 1. Runtime Readiness

| Item | Expected | Result | Evidence | Owner |
|---|---|---|---|---|
| 域名可访问 | 首页返回 200/302 | pending | `<path>` | `<fill-me>` |
| API `/health` | 200 | pending | `<path>` | `<fill-me>` |
| API `/health/ready` | 200 | pending | `<path>` | `<fill-me>` |
| `.env.uat` 校验 | `ops:env:check` 通过 | pending | `<path>` | `<fill-me>` |
| Redis / S3 / DB 依赖 | 应用日志无启动失败 | pending | `<path>` | `<fill-me>` |

## 2. Data Readiness

| Item | Expected | Result | Evidence | Owner |
|---|---|---|---|---|
| 目标批次已导入 UAT staging | `import_batches` 可查到 `<batch-id>` | pending | `<path>` | `<fill-me>` |
| 样本数据可在列表页看到 | students / billing / homework 至少各 1 条 | pending | `<path>` | `<fill-me>` |
| reject 文件已归档 | CSV 可追溯 owner 与 disposition | pending | `<path>` | `<fill-me>` |

## 3. Account Readiness

| Role | Username | Password Delivery | Login Result | Evidence |
|---|---|---|---|---|
| super_admin | `admin` or `<fill-me>` | `<fill-me>` | pending | `<path>` |
| principal | `<fill-me>` | `<fill-me>` | pending | `<path>` |
| teacher | `teacher.zhang` or `<fill-me>` | `<fill-me>` | pending | `<path>` |
| finance | `<fill-me>` | `<fill-me>` | pending | `<path>` |

说明：
- 仓库 seed 默认只保证 `admin`、`teacher.zhang` 存在。
- `principal`、`finance` 需在 UAT 初始化后补创建并记录凭据交付方式。

## 4. Observability Readiness

| Item | Expected | Result | Evidence | Owner |
|---|---|---|---|---|
| 应用日志可取到 | 发布窗口内可检索 | pending | `<path>` | `<fill-me>` |
| migration log 已归档 | `logs/` 下可追溯 | pending | `<path>` | `<fill-me>` |
| go-live observation 模板已就位 | 文件已生成 | pending | `<path>` | `<fill-me>` |
| defect triage 模板已就位 | 文件已生成 | pending | `<path>` | `<fill-me>` |

## 5. Decision

| Decision | Owner | Timestamp | Notes |
|---|---|---|---|
| `ready / partial / blocked` | `<fill-me>` | `<fill-me>` | |
