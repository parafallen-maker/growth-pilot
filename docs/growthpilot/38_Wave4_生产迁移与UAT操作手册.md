# 38 Wave 4 生产迁移与 UAT 操作手册

> 覆盖范围：`QA-20` ~ `QA-29`
>
> 用途：给 QA / 发布负责人 / 业务代表一份可直接照单执行的迁移与 UAT 手册。
>
> 状态声明：本文交付的是仓库内可执行的 runbook、模板、SQL 与证据目录规范；除非另有执行记录，不代表 staging / UAT 已真实完成。

---

## 1. 交付映射

| Todo | 本文交付 |
|---|---|
| `QA-20` | 正式迁移脚本入口、模式说明、artifact 要求 |
| `QA-21` | 固定迁移顺序、退出条件、阻断规则 |
| `QA-22` | 字段映射、清洗、脱敏、去重规则 |
| `QA-23` | 全量迁移执行步骤、日志与 rollback checkpoint |
| `QA-24` | SQL 校验模板、抽样方法、验证清单 |
| `QA-25` | UAT 角色/场景计划 |
| `QA-26` | UAT 环境搭建检查项、账号与数据准备方式 |
| `QA-27` | UAT 执行方法与签收 |
| `QA-28` | 缺陷清单与分级处理规则 |
| `QA-29` | 性能基准测试流程与阈值 |

---

## 2. Release Workspace 约定

每次迁移/UAT 演练必须先生成独立工作目录，所有证据只认这一个路径。

```bash
npm run ops:release:init -- \
  --release-id wave4-uat-001 \
  --target-env uat \
  --batch-id BATCH-UAT-001
```

默认输出目录：

```text
docs/growthpilot/artifacts/uat/wave4-uat-001/
```

脚手架会生成：
- `release-gate.yaml`
- `uat-execution.yaml`
- `uat-environment-checklist.md`
- `migration-execution-log.md`
- `migration-validation-checklist.md`
- `prod-db-init-checklist.md`
- `go-live-observation.md`
- `release-acceptance-report.md`
- `sql/migration-validation.sql`
- `checks/`, `evidence/`, `logs/`, `sql/`

目录使用约定：
- `checks/`：`ops:env:check` 输出、`sha256`、SQL 校验结果、`curl` 响应
- `evidence/`：截图、录屏、导出 CSV/PDF、签字文件
- `logs/`：所有命令的 `tee` 输出
- `sql/`：替换过批次号后实际执行的 SQL

---

## 3. 仓库内固定命令

| 用途 | 命令 | 说明 |
|---|---|---|
| 初始化工作目录 | `npm run ops:release:init -- ...` | 生成模板与证据目录 |
| 校验 UAT 环境变量 | `npm run ops:env:check -- --env-file .env.uat --mode uat` | 校验必填 env |
| 备份数据库 | `DEPLOY_ENV_FILE=.env.uat npm run db:backup -- --label <label>` | `db:*` 脚本默认读 `deploy/.env`，UAT/Prod 应显式传 `DEPLOY_ENV_FILE` |
| 迁移 report-only | `npm run migration:release -- --report-only ...` | 生成 release report 和 artifact，不写库 |
| 迁移 dry-run | `npm run migration:release -- --dry-run ...` | 解析输入并生成 artifact，不写库 |
| 迁移 db-apply | `npm run migration:release -- --db-apply ...` | 写入 `qa_staging.*` |

约束说明：
- 当前仓库迁移脚本的写库范围是 `qa_staging.import_batches`、`qa_staging.staging_raw_rows`、`qa_staging.staging_normalized_rows`、`qa_staging.staging_rejects`。
- 当前仓库并没有“把 staging 直接提升到正式业务表”的脚本，因此本文将“迁移执行完成”和“业务表最终落库完成”分开记录。
- `migration:release` 支持 `--env-file`；`db:*` 脚本依赖 `DEPLOY_ENV_FILE` 或已导出的 `DATABASE_URL`。

---

## 4. 操作前准备

1. 准备源文件：
   - Excel 原件留在只读目录，不进入 repo。
   - 实际导入文件统一转成 UTF-8 `csv` 或 `json`。
   - 文件命名统一：`<domain>-<term>-<date>.csv`。
2. 固定本次批次元数据：
   - `release_id`
   - `batch_id`
   - `target_env=uat`
   - `source_system`
   - 负责人、reject owner、rollback owner
3. 记录输入文件 SHA256：

```bash
shasum -a 256 /secure-imports/2026-spring-students.csv \
  | tee docs/growthpilot/artifacts/uat/wave4-uat-001/checks/source-files.sha256
```

4. 校验环境变量：

```bash
npm run ops:env:check -- \
  --env-file .env.uat \
  --mode uat \
  | tee docs/growthpilot/artifacts/uat/wave4-uat-001/checks/env-check.json
```

5. 在写库前先做一次备份：

```bash
DEPLOY_ENV_FILE=.env.uat \
npm run db:backup -- \
  --label BATCH-UAT-001-pre-apply \
  | tee docs/growthpilot/artifacts/uat/wave4-uat-001/logs/db-backup.log
```

6. 如果后续要直接执行 `psql`、`curl "$API_BASE_URL"` 这类命令，先导出 `.env.uat`：

```bash
set -a
. ./.env.uat
set +a
```

---

## 5. `QA-20` 迁移脚本生产化

正式入口统一使用：

```bash
npm run migration:release -- --dry-run ...
```

底层脚本：
- `deploy/scripts/run-production-migration.mjs`
- `scripts/migration/run-staging-import.mjs`

### 5.1 模式定义

| 模式 | 命令 | 用途 |
|---|---|---|
| dry-run | `--dry-run` | 解析输入、生成 artifact，不写库 |
| report-only | `--report-only` | 生成给 Go/No-Go / owner 复核的 release report，不写库 |
| db-apply | `--db-apply` | 将结果写入 `qa_staging.*`，仅限 staging/UAT/prod 执行窗口 |

### 5.2 统一 artifact 约束

每次运行至少保留：
- `<batch>.summary.json`
- `<batch>.raw.ndjson`
- `<batch>.normalized.ndjson`
- `<batch>.reject-report.csv`
- `<batch>.db-plan.sql`
- `<batch>.release-report.md`

---

## 6. `QA-21` 迁移顺序编排

迁移顺序固定，不允许跨层跳：

1. 基础字典：`grade_levels`、`subjects`、`error_tags`、`habit_dimensions`、`fee_items`
2. 校区、学期
3. 教师
4. 家庭、监护人
5. 学生、在读档、教师分配
6. 收费产品、合同、账单、收款
7. 作业提交、AI 分析、教师复核
8. 习惯观察、成长目标
9. 设备、绑定、签到、学习时长

每一层退出条件：
- 前一层 `reject rate < 2%`
- 外键依赖全部可解
- 本层样本抽查通过
- owner 在 `release-gate.yaml` 或 `migration-execution-log.md` 留结论

---

## 7. `QA-22` 数据清洗规则确认

### 7.1 关键字段映射

| Excel 列 | 目标字段 | 规则 |
|---|---|---|
| 学生编号 | `students.student_no` | 去空格；为空时进入人工确认池 |
| 学生姓名 | `students.name` | 保留原文，不做简繁转换 |
| 学科 | `homework_submissions.subject_code` | `数学/语文/英语` -> `math/chinese/english` |
| 单亲情况 | `families.family_structure` | `是/否` -> `single_parent/nuclear_or_other` |
| 金额 | `*_amount_cents` | 元转分；不能出现分以下精度 |
| 日期 | `*_at` / `*_date` | Excel serial、`YYYY/M/D`、`YYYY-MM-DD` 统一成 ISO |
| 手机号 | `guardians.mobile` / `families.primary_mobile` | 去空格和横线，11 位校验 |

### 7.2 空值 / 脱敏 / 去重

- 空字符串、`/`、`无`、`N/A` 一律先转 `null`
- 主键类字段为空直接 reject
- 手机号 artifact 里只保留后 4 位
- 身份证号只允许 `前 3 + 后 2` 可见
- 去重优先级：
  1. `student_no`
  2. `姓名 + 学期`
  3. `姓名 + primary_guardian_phone + 学期`

---

## 8. `QA-23` 全量迁移执行

### 8.1 执行前阻断条件

满足任一项时，直接停止，不进入 `db-apply`：
- `ops:env:check` 未通过
- 未生成 `source-files.sha256`
- 没有执行前数据库备份
- `reject-report.csv` 无 owner 或无 disposition
- `rejectedRows / rawRows >= 2%`
- `migration-validation.sql` 尚未渲染到当前 release workspace

### 8.2 标准执行顺序

1. `report-only`
2. `dry-run`
3. owner 审核 `reject-report.csv`
4. QA 在 `migration-execution-log.md` 记录可放行结论
5. `db-apply`
6. 归档日志、artifact、SQL 与截图

### 8.3 推荐执行命令

假设：
- `RELEASE_DIR=docs/growthpilot/artifacts/uat/wave4-uat-001`
- `BATCH_ID=BATCH-UAT-001`
- `INPUT=/secure-imports/2026-spring-students.csv`

```bash
npm run migration:release -- \
  --report-only \
  --target-env uat \
  --env-file .env.uat \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.report-only.log"
```

```bash
npm run migration:release -- \
  --dry-run \
  --target-env uat \
  --env-file .env.uat \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.dry-run.log"
```

```bash
npm run migration:release -- \
  --db-apply \
  --target-env uat \
  --env-file .env.uat \
  --batch-id "$BATCH_ID" \
  --csv "$INPUT" \
  --sourceSystem excel-export \
  --sourceFile "$(basename "$INPUT")" \
  --artifacts-dir "$RELEASE_DIR" \
  | tee "$RELEASE_DIR/logs/${BATCH_ID}.db-apply.log"
```

### 8.4 执行记录必填字段

在 `migration-execution-log.md` 中至少填写：
- 执行人 / 指挥人 / reject owner / rollback owner
- 输入文件名与 SHA256
- `batch_id`
- 每一步开始/结束时间
- 实际命令
- 退出码
- 日志路径
- `rawRows` / `readyToLoadRows` / `rejectedRows`

### 8.5 Rollback Checkpoint

| 时点 | 允许动作 | 不允许动作 |
|---|---|---|
| `report-only` 后 | 修改 source file、补映射、重跑 | 声称已完成迁移 |
| `dry-run` 后 | 复核 reject、调整批次、重跑 | 写库 |
| `db-apply` 后 | 记录 `qa_staging.*` 影响范围，必要时恢复备份或清理该 `batch_id` | 在无备份/无批准下手工清空 staging |

当前仓库内可行 rollback 路径：
1. 优先使用 `DEPLOY_ENV_FILE=.env.uat npm run db:restore -- --input <backup.sql.gz>` 恢复到写库前快照。
2. 若明确确认本次只写 `qa_staging.*` 且允许局部回退，可由 DBA 审核后手工执行按 `batch_id` 删除 staging 数据的 SQL，并把 SQL 与审批截图归档到 `sql/` 和 `evidence/`。

---

## 9. `QA-24` 迁移数据校验

### 9.1 校验分层

当前仓库必须完成的校验层：
1. `qa_staging.import_batches` 总量与状态核对
2. `qa_staging.staging_*` 逐域抽样与 reject 分布核对
3. 金额链路、幂等键、未分派 reject 校验

只有在另有正式业务表落库步骤时，才追加：
4. `students` / `student_enrollments` / `contracts` / `invoices` / `payments` / `refunds` 的 final-table 校验

### 9.2 渲染 SQL 模板

生成工作目录后，把 `sql/migration-validation.sql` 里的占位符替换成当前批次号：

```bash
sed "s/<batch-id>/${BATCH_ID}/g" \
  "$RELEASE_DIR/sql/migration-validation.sql" \
  > "$RELEASE_DIR/sql/${BATCH_ID}.migration-validation.sql"
```

执行方式示例：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$RELEASE_DIR/sql/${BATCH_ID}.migration-validation.sql" \
  | tee "$RELEASE_DIR/checks/${BATCH_ID}.migration-validation.txt"
```

如本机无 `psql`，使用目标环境已有的 DB 客户端容器执行等价命令，并保留输出。

### 9.3 必做核对项

| 检查项 | 标准 | 证据 |
|---|---|---|
| raw 行数 | 与输入文件记录数一致 | `checks/*.migration-validation.txt` |
| normalized 行数 | `ready_to_load + rejected = raw` | 同上 |
| reject 分布 | 每个 `reject_code` 都有 owner | `reject-report.csv` |
| 抽样 | 每域至少 10 条 | `migration-validation-checklist.md` |
| 幂等键 | `duplicate idempotency key = 0` | SQL 结果 |
| 金额链 | `refund <= payment`，`invoice items = invoice`，`payable = total - discount` | SQL 结果 |

### 9.4 抽样方法

抽样口径固定：
- `students`：`studentNo`、`studentName`、`gradeLabel`、`primaryTeacherName`
- `families`：`familyCode` / 联系方式 / 家庭结构
- `homework`：`studentNo`、`subject`、`homeworkDate`、`accuracyPct`
- `billing`：`contractNo`、`invoiceNo`、金额链

每条样本至少留下：
- 来源行号
- 归一化后的关键字段
- 人工核对结论
- 截图或导出文件路径

### 9.5 Final-table 校验的边界说明

当前仓库只提供 staging 导入脚本，因此：
- `QA-24` 在本轮可完整准备 SQL、清单与取证模板
- 若未实际执行“正式业务表落库”，则 final-table 校验项应在 `migration-validation-checklist.md` 中标记为 `not-applicable`，不能假装已通过

---

## 10. `QA-25` UAT 测试计划

详细执行模板见：
- `docs/growthpilot/templates/uat_execution_template.yaml`

本轮最小场景数：
- `super_admin`: 5
- `principal`: 5
- `teacher`: 6
- `finance`: 5

必含场景：
- 登录 / 当前用户
- 列表筛选
- 详情页
- 创建或修改
- 权限边界
- 错误提示

---

## 11. `QA-26` UAT 环境搭建

### 11.1 环境必须独立

UAT 最低要求：
- UAT 域名与数据库独立于生产
- `.env.uat` 与 `.env.prod` 分离管理
- 目标 `batch_id` 已导入 UAT 对应库
- 对象存储桶、日志、监控证据路径独立

### 11.2 运行时检查步骤

```bash
npm run ops:env:check -- \
  --env-file .env.uat \
  --mode uat \
  | tee "$RELEASE_DIR/checks/uat-env-check.json"
```

```bash
curl -i "$API_BASE_URL/health" \
  | tee "$RELEASE_DIR/checks/health.txt"
```

```bash
curl -i "$API_BASE_URL/health/ready" \
  | tee "$RELEASE_DIR/checks/health-ready.txt"
```

### 11.3 账号可用性检查

当前 seed 基线可依赖的默认账号只有：
- `admin / admin123`
- `teacher.zhang / teacher123`

`principal`、`finance` 不保证由 seed 自动生成，必须在 UAT 搭建阶段补创建。建议流程：

1. 先用 `admin` 登录，拿到 access token：

```bash
curl -sS -X POST "$API_BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | tee "$RELEASE_DIR/checks/admin-login.json"
```

2. 使用登录后的 token 调 `GET /settings/campuses` 获取可分配的 `campusId`。
3. 通过 `POST /users` 创建 `principal`、`finance` 专用 UAT 账号，并把用户名、交付方式、责任人登记到 `uat-environment-checklist.md`。

### 11.4 数据就绪检查

至少确认：
- `qa_staging.import_batches` 能查到本次 `batch_id`
- UAT 页面上可看到迁移后的学生、作业、账单样本
- `reject-report.csv` 已归档，且 owner/disposition 完整

### 11.5 证据要求

`QA-26` 至少留下：
- 域名/健康检查响应
- `ops:env:check` 输出
- 账号登录截图或 `curl` 返回
- 样本数据在页面上的截图
- `uat-environment-checklist.md`

如果当前只完成文档、模板和命令准备，尚未完成真实部署/导数/账号创建，则 `QA-26` 只能记为 `partial`。

---

## 12. `QA-27` UAT 执行与签收

执行顺序：
1. QA 带跑
2. 业务角色逐项操作
3. 记录结果与缺陷编号
4. 当场决定 `pass / conditional-pass / fail`

每个场景必须留下：
- 页面截图或录屏
- 关键接口返回
- 如失败，对应缺陷编号

---

## 13. `QA-28` 缺陷清单收集与修复

统一模板：
- `docs/growthpilot/templates/defect_triage_template.md`

分级规则：
- `blocker / P0`：必须清零
- `major / P1`：原则上清零，若条件放行需 owner 书面确认
- `minor / P2/P3`：必须入 backlog，并写明修复时间

---

## 14. `QA-29` 性能基准测试

基准目标：
- 50 并发用户
- 首页加载 `< 3s`
- API 列表查询 `P95 < 300ms`
- 10MB 文件上传 `< 5s`

推荐执行顺序：
1. 先跑单用户 warm-up
2. 再跑 10 并发
3. 最后跑 50 并发
4. 每轮保留原始结果、P95、失败率、截图

未在真实 UAT 环境跑出结果前，不得把 `QA-29` 标记完成。
