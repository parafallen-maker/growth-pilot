# 38 Wave 4 生产迁移与 UAT 操作手册

> 覆盖范围：`QA-20` ~ `QA-29`
>
> 用途：给 QA / 发布负责人 / 业务代表一份可直接照单执行的迁移与 UAT 手册。
>
> 状态声明：本文只交付操作方案、命令、模板与验收口径；除非另有执行记录，不表示 staging/UAT 已真实完成。

---

## 1. 交付映射

| Todo | 本文交付 |
|---|---|
| `QA-20` | 正式迁移脚本用法、模式说明、产物要求 |
| `QA-21` | 固定迁移顺序与每阶段阻断条件 |
| `QA-22` | 字段映射、清洗、脱敏、去重规则 |
| `QA-23` | 全量迁移执行步骤与证据留存 |
| `QA-24` | 迁移后 SQL 校验与抽样流程 |
| `QA-25` | UAT 角色/场景计划 |
| `QA-26` | UAT 环境搭建检查项 |
| `QA-27` | UAT 执行方法与签收 |
| `QA-28` | 缺陷清单与分级处理规则 |
| `QA-29` | 性能基准测试流程与阈值 |

---

## 2. 操作前准备

1. 先生成一份本次发布工作目录：

```bash
npm run ops:release:init -- \
  --release-id wave4-uat-001 \
  --target-env uat \
  --batch-id BATCH-UAT-001
```

2. 准备输入数据：
   - Excel 原件归档到只读目录。
   - 实际导入文件统一转成 UTF-8 `csv` 或 `json`。
   - 文件命名统一：`<domain>-<term>-<date>.csv`
3. 准备环境：
   - `.env.uat` 或等价环境变量已就绪。
   - PostgreSQL staging 库可连通。
   - 本次 `batch_id` 已登记到 `release-gate.yaml`。

---

## 3. `QA-20` 迁移脚本生产化

正式入口统一使用：

```bash
npm run migration:release -- --dry-run ...
```

底层脚本：
- `deploy/scripts/run-production-migration.mjs`
- `scripts/migration/run-staging-import.mjs`

### 3.1 模式定义

| 模式 | 命令 | 用途 |
|---|---|---|
| dry-run | `--dry-run` | 解析输入、生成 artifact、不写库 |
| report-only | `--report-only` | 解析输入并生成 release report，供 Go/No-Go 会前阅读 |
| db-apply | `--db-apply` | 将结果写入 `qa_staging.*`，仅限 staging/UAT/prod 执行窗口 |

### 3.2 推荐命令

```bash
npm run migration:release -- \
  --dry-run \
  --target-env uat \
  --batch-id BATCH-UAT-001 \
  --csv scripts/migration/fixtures/staging-import-sample.csv
```

```bash
npm run migration:release -- \
  --report-only \
  --target-env uat \
  --batch-id BATCH-UAT-001 \
  --csv scripts/migration/fixtures/staging-import-sample.csv
```

```bash
DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --db-apply \
  --target-env uat \
  --batch-id BATCH-UAT-001 \
  --csv <real-file.csv>
```

### 3.3 产物要求

每次运行必须留存：
- `*.summary.json`
- `*.raw.ndjson`
- `*.normalized.ndjson`
- `*.reject-report.csv`
- `*.db-plan.sql`
- `*.release-report.md`

---

## 4. `QA-21` 迁移顺序编排

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

每一层的退出条件：
- 前一层 `reject rate < 2%`
- 外键依赖全部可解
- 本层样本抽查通过
- owner 在 `release-gate.yaml` 里签字

---

## 5. `QA-22` 数据清洗规则确认

### 5.1 关键字段映射

| Excel 列 | 目标字段 | 规则 |
|---|---|---|
| 学生编号 | `students.student_no` | 去空格；为空时进入人工确认池 |
| 学生姓名 | `students.name` | 保留原文，不做简繁转换 |
| 学科 | `homework_submissions.subject_code` | `数学/语文/英语` 映射成 `math/chinese/english` |
| 单亲情况 | `families.structure_code` | `是/否` 映射成 `single_parent/nuclear_or_other` |
| 金额 | `*_cents` | 元转分；不能出现分以下精度 |
| 日期 | `*_at` / `*_date` | Excel serial、`YYYY/M/D`、`YYYY-MM-DD` 统一成 ISO |
| 手机号 | `guardians.phone` | 去空格和横线，11 位校验 |

### 5.2 空值规则

- 空字符串、`/`、`无`、`N/A` 一律先转 `null`
- 主键类字段为空直接 reject
- 非关键备注字段可保留为空

### 5.3 脱敏与校验

- 手机号：导入前只保留后 4 位作为 artifact 展示值
- 身份证号：artifact 里只允许 `前 3 + 后 2` 可见
- 原始敏感值只允许存在受控源文件，不写入共享文档

### 5.4 去重策略

主规则：
1. `student_no`
2. `姓名 + 学期`
3. `姓名 + primary_guardian_phone + 学期`

冲突处理：
- 同一 `student_no` 对应多主体：`reject`
- 无编号但疑似重复：`manual-review`
- 账单/收款编号重复：阻断本批次放行

---

## 6. `QA-23` 全量迁移执行

### 6.1 执行顺序

1. `report-only`
2. `dry-run`
3. owner 审核 `reject-report.csv`
4. `db-apply`
5. 产出执行记录并归档

### 6.2 真实批次执行模板

```bash
DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --db-apply \
  --target-env uat \
  --batch-id BATCH-UAT-REAL-001 \
  --csv /secure-imports/2026-spring-students.csv \
  --sourceSystem excel-export \
  --sourceFile 2026-spring-students.csv \
  --artifacts-dir docs/growthpilot/artifacts/uat/BATCH-UAT-REAL-001
```

### 6.3 执行记录最少字段

- 执行人
- 执行时间
- 输入文件 sha256
- `batch_id`
- mode
- 数据库实例
- summary 结果
- reject owner

---

## 7. `QA-24` 迁移数据校验

### 7.1 总数核对

```sql
select batch_id, count(*) as raw_rows
from qa_staging.staging_raw_rows
where batch_id = '<BATCH_ID>'
group by batch_id;

select batch_id, import_status, count(*) as normalized_rows
from qa_staging.staging_normalized_rows
where batch_id = '<BATCH_ID>'
group by batch_id, import_status
order by import_status;

select batch_id, reject_code, count(*) as reject_rows
from qa_staging.staging_rejects
where batch_id = '<BATCH_ID>'
group by batch_id, reject_code
order by reject_code;
```

### 7.2 抽样核对

每个导入域至少抽 10 条，核对：
- 业务编号
- 主体名称
- 日期
- 金额
- 外键链路

### 7.3 一致性检查

```sql
-- 合同金额 = 账单金额汇总
select contract_no, contract_amount_cents, invoice_sum_cents
from qa_staging_contract_amount_check
where batch_id = '<BATCH_ID>'
  and contract_amount_cents <> invoice_sum_cents;
```

如无现成视图，则在验收记录中补充查询 SQL 和截图。

---

## 8. `QA-25` UAT 测试计划

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

## 9. `QA-26` UAT 环境搭建

上线前至少确认：
- UAT 域名与数据库独立于生产
- 迁移后的真实数据已导入 UAT
- 四类测试账号可登录
- 文件上传存储桶与回收策略已配置
- 日志、健康检查、监控已能产证据

如果当前仅完成文档准备、尚未完成环境部署，`QA-26` 只能记为 `partial` 或 `todo`。

---

## 10. `QA-27` UAT 执行与签收

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

## 11. `QA-28` 缺陷清单收集与修复

统一模板：
- `docs/growthpilot/templates/defect_triage_template.md`

分级规则：
- `blocker / P0`：必须清零
- `major / P1`：原则上清零，若条件放行需 owner 书面确认
- `minor / P2/P3`：必须入 backlog，并写明修复时间

---

## 12. `QA-29` 性能基准测试

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
