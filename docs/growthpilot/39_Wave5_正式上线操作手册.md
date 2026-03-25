# 39 Wave 5 正式上线操作手册

> 覆盖范围：`INF-30` ~ `INF-39`、`QA-30`
>
> 用途：把正式环境初始化、数据库准备、迁移执行、部署、冒烟与 Go/No-Go 的执行顺序固定下来。
>
> 状态声明：本文交付的是正式环境操作手册、清单模板与仓库内 helper script 用法；除非另有执行记录，不代表正式环境已部署或已迁移。

---

## 1. 依赖前置

执行本手册前，必须先满足：
- Wave 4 的 UAT 演练已至少完成一轮
- `.env.prod` 已从根目录 `.env.prod.example` 衍生并填入真实值
- 发布工作目录已生成，且 `release-gate.yaml` 已填入 commit、owner、风险
- 备份、回滚、DB、发布负责人均在线

建议先初始化正式发布工作目录：

```bash
npm run ops:release:init -- \
  --release-id wave5-prod-cutover-001 \
  --target-env prod \
  --batch-id BATCH-PROD-001
```

默认目录：

```text
docs/growthpilot/artifacts/prod/wave5-prod-cutover-001/
```

该目录中会包含：
- `release-gate.yaml`
- `migration-execution-log.md`
- `migration-validation-checklist.md`
- `prod-db-init-checklist.md`
- `sql/migration-validation.sql`
- `checks/`, `evidence/`, `logs/`, `sql/`

---

## 2. 正式环境命令约定

| 用途 | 命令 | 说明 |
|---|---|---|
| 校验生产 env | `npm run ops:env:check -- --env-file .env.prod --mode prod` | 必须先跑 |
| 数据库备份 | `DEPLOY_ENV_FILE=.env.prod npm run db:backup -- --label <label>` | `db:*` 脚本需显式传 `DEPLOY_ENV_FILE` |
| 数据库恢复 | `DEPLOY_ENV_FILE=.env.prod npm run db:restore -- --input <file.sql.gz>` | rollback 主路径 |
| 执行 migration | `DEPLOY_ENV_FILE=.env.prod npm run db:migrate` | 调 `deploy/scripts/db-migrate.sh` |
| 执行 seed | `DEPLOY_ENV_FILE=.env.prod npm run db:seed` | 调 `deploy/scripts/db-seed.sh` |
| 正式迁移 report-only | `npm run migration:release -- --report-only --target-env prod ...` | 不写库 |
| 正式迁移 db-apply | `npm run migration:release -- --db-apply --confirm-prod --target-env prod ...` | 仅写 `qa_staging.*` |

关键差异：
- `migration:release` 接受 `--env-file .env.prod`
- `db:*` 脚本不认 `--env-file`，而是读 `DEPLOY_ENV_FILE` 或 shell 中已导出的 `DATABASE_URL`
- 当前仓库的生产迁移脚本依然只写 `qa_staging.*`，不直接写正式业务表

如需直接执行 `psql "$DATABASE_URL"`、`curl "$API_BASE_URL"` 等命令，先导出 `.env.prod`：

```bash
set -a
. ./.env.prod
set +a
```

---

## 3. `INF-30` ~ `INF-35` 执行前复核摘要

正式上线前至少确认：
- `INF-30`：主机基线、非 root 部署用户、防火墙、SSH key 已处理
- `INF-31`：域名与 DNS 切换策略、TTL、解析验证已完成
- `INF-32`：TLS 证书已申请且可自动续期
- `INF-33`：`.env.prod` 已校验通过
- `INF-34`：日志归档路径与 `logrotate` 已明确
- `INF-35`：健康检查、资源监控、告警阈值已落地

这些项的详细说明仍以运维手册和本文件对应章节为准；未完成任何一项时，不进入 `INF-36`。

---

## 4. `INF-36` 生产数据库初始化

### 4.1 完成标准

`INF-36` 要求的是：
1. 生产数据库实例存在且可连接
2. schema migration 成功执行
3. seed 基线写入完成
4. 执行日志、证据、验证结果全部归档

### 4.2 前置条件

只有以下条件全部满足时才执行：
- `release-gate.yaml` 已 `go`
- 生产 env 校验通过
- 数据库备份已执行并验证文件可访问
- 回滚负责人在线
- 本次维护窗口已开始

### 4.3 标准执行步骤

假设：
- `RELEASE_DIR=docs/growthpilot/artifacts/prod/wave5-prod-cutover-001`
- `BATCH_ID=BATCH-PROD-001`

1. 校验生产环境变量：

```bash
npm run ops:env:check -- \
  --env-file .env.prod \
  --mode prod \
  | tee "$RELEASE_DIR/checks/prod-env-check.json"
```

2. 生成执行前备份：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:backup -- \
  --label "${BATCH_ID}-pre-db-init" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.pre-db-backup.log"
```

3. 检查数据库是否已存在。

若本机有 `psql`，推荐：

```bash
psql "${DATABASE_URL%/*}/postgres" -v ON_ERROR_STOP=1 \
  -c "select datname from pg_database where datname = 'growthpilot';" \
  | tee "$RELEASE_DIR/checks/db-existence-check.txt"
```

若通过 Docker Compose 管理数据库，也可使用：

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U gp -d postgres -c "select datname from pg_database where datname = 'growthpilot';" \
  | tee "$RELEASE_DIR/checks/db-existence-check.txt"
```

4. 仅在数据库不存在时创建：

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  createdb -U gp growthpilot \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.create-db.log"
```

5. 执行 migration：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:migrate \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.db-migrate.log"
```

6. 执行 seed：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:seed \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.db-seed.log"
```

### 4.4 结果验证

至少验证：
- migration 日志无失败
- seed 输出包含 campuses / roles / users / schoolTerms / dictionaries
- `admin` 账号至少可完成一次 `/auth/login`

建议附加验证：

```bash
curl -sS -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | tee "$RELEASE_DIR/checks/admin-login-after-seed.json"
```

### 4.5 Rollback Checkpoint

| 时点 | 触发条件 | 动作 |
|---|---|---|
| create-db 前 | env 校验失败、无备份 | 停止执行 |
| db-migrate 后 | migration 异常或 schema 不符合预期 | 不执行 seed，评估 `db:restore` |
| db-seed 后 | seed 结果异常且尚未开放写流量 | 优先恢复备份或重建空库后重跑 |

当前仓库内明确可执行的 rollback 命令：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:restore -- \
  --input /absolute/path/to/backup.sql.gz
```

### 4.6 证据留存

`INF-36` 至少归档：
- `prod-db-init-checklist.md`
- `prod-env-check.json`
- `db-existence-check.txt`
- `*.pre-db-backup.log`
- `*.db-migrate.log`
- `*.db-seed.log`
- 登录验证返回或截图

---

## 5. `INF-37` 生产数据迁移

### 5.1 边界说明

当前仓库里的正式迁移脚本：
- 支持 `report-only`、`dry-run`、`db-apply`
- 在 `prod + db-apply` 下强制要求 `--confirm-prod`
- 实际写入范围仍为 `qa_staging.*`

因此，本项在当前仓库语义下表示：
- 生产批次的 source inventory、artifact、写库日志、校验 SQL、rollback checkpoint 已准备好
- 可以把生产数据安全导入生产库的 staging schema
- 还不能声称“正式业务表全量导入已闭环”，除非另有下游落库步骤与证据

### 5.2 正式执行顺序

1. `report-only`
2. `dry-run`
3. owner 复核 `reject-report.csv`
4. Go/No-Go 二次确认
5. `db-apply --confirm-prod`
6. 执行 `QA-24` 对应校验 SQL
7. 记录结论，不满足标准则进入 rollback / no-go

### 5.3 推荐命令

假设：
- `RELEASE_DIR=docs/growthpilot/artifacts/prod/wave5-prod-cutover-001`
- `BATCH_ID=BATCH-PROD-001`
- `INPUT=/secure-imports/final-cutover.csv`

先记录输入文件哈希：

```bash
shasum -a 256 "$INPUT" \
  | tee "$RELEASE_DIR/checks/source-files.sha256"
```

执行前备份：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:backup -- \
  --label "${BATCH_ID}-pre-migration" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.pre-migration-backup.log"
```

report-only：

```bash
npm run migration:release -- \
  --report-only \
  --target-env prod \
  --env-file .env.prod \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.report-only.log"
```

dry-run：

```bash
npm run migration:release -- \
  --dry-run \
  --target-env prod \
  --env-file .env.prod \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.dry-run.log"
```

db-apply：

```bash
npm run migration:release -- \
  --db-apply \
  --confirm-prod \
  --target-env prod \
  --env-file .env.prod \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.db-apply.log"
```

### 5.4 放行 / 阻断规则

默认阻断条件：
- `ops:env:check` 失败
- 未生成执行前备份
- `report-only` 或 `dry-run` 失败
- `reject rate >= 2%`
- 任一 `CONFLICT_*`、金额不平、未分派 reject 未解决
- `migration-validation-checklist.md` 未填写

### 5.5 校验与证据

正式迁移后，至少保留：
- `migration-execution-log.md`
- `migration-validation-checklist.md`
- `sql/<batch>.migration-validation.sql`
- `<batch>.summary.json`
- `<batch>.reject-report.csv`
- `<batch>.release-report.md`
- `checks/<batch>.migration-validation.txt`
- `logs/<batch>.report-only.log`
- `logs/<batch>.dry-run.log`
- `logs/<batch>.db-apply.log`

### 5.6 Rollback 路径

当前仓库内可执行且明确的 rollback 路径只有两条：

1. 数据库备份恢复：

```bash
DEPLOY_ENV_FILE=.env.prod \
npm run db:restore -- \
  --input /absolute/path/to/pre-migration-backup.sql.gz
```

2. 经 DBA 批准后，只对 `qa_staging.*` 做按 `batch_id` 的局部清理。

说明：
- 路径 2 只适用于确认没有任何下游业务表消费该批次 staging 数据的场景。
- 若已发生下游消费，必须以备份恢复为准，不能靠手工删 staging 假装回滚。

---

## 6. `INF-38` 首次部署

建议顺序：
1. 拉取已签字的 commit / tag
2. 校验 `.env.prod`
3. 备份数据库和对象存储
4. 启动基础设施
5. 启动 API / Web
6. 等待健康检查
7. 执行烟测

如果 `docker-compose.prod.yml` 尚未在仓库交付，则本步骤仍保持 `todo`，只允许准备手册，不允许假装执行。

---

## 7. `INF-39` 上线冒烟验证

最小烟测清单：
- 首页加载成功
- 登录成功
- `/auth/me` 返回当前用户
- 学生列表可看到迁移数据
- 作业上传成功
- 文件下载成功
- 账单列表可加载

每项都要留下：
- 时间
- 执行人
- 结果
- 证据链接

推荐把结果写入：
- `go-live-observation.md`
- `release-acceptance-report.md`

---

## 8. `QA-30` Go/No-Go 检查清单

推荐模板：
- `docs/growthpilot/templates/qa_release_gate_template.yaml`

会前必答：
- 备份是否已做且可恢复
- 回滚路径是否已演练
- UAT blocker 是否清零
- 性能是否达标
- 迁移 reject 是否在可接受范围
- 负责人是否在线

未满足任一项，默认 `no-go`。
