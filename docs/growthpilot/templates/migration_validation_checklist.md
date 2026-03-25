# Migration Validation Checklist

- release_id: `<release-id>`
- environment: `<target-env>`
- batch_id: `<batch-id>`
- validator: `<fill-me>`
- validation_window: `<YYYY-MM-DD HH:mm +08:00>`

## 1. Count Reconciliation

| Check | SQL / Method | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|
| raw rows count | `staging_raw_rows` | `<fill-me>` | `<fill-me>` | pending | `<path>` |
| normalized rows count | `staging_normalized_rows` | `<fill-me>` | `<fill-me>` | pending | `<path>` |
| reject rows count | `staging_rejects` | `<fill-me>` | `<fill-me>` | pending | `<path>` |
| ready rows count | `import_batches.ready_row_count` | `<fill-me>` | `<fill-me>` | pending | `<path>` |
| reject rate `< 2%` | `rejected / raw` | `< 2%` | `<fill-me>` | pending | `<path>` |

## 2. Domain Sampling

| Domain | Sample Size | Key Fields | Validator | Result | Evidence |
|---|---|---|---|---|---|
| students | 10 | `studentNo,name,gradeLabel,primaryTeacherName` | `<fill-me>` | pending | `<path>` |
| families | 10 | `familyCode,primaryContactName,primaryMobile` | `<fill-me>` | pending | `<path>` |
| homework | 10 | `studentNo,subject,homeworkDate,accuracyPct` | `<fill-me>` | pending | `<path>` |
| billing | 10 | `contractNo,invoiceNo,total/payable/payment/refund` | `<fill-me>` | pending | `<path>` |

## 3. Integrity Checks

| Check | Pass Criteria | Result | Evidence | Notes |
|---|---|---|---|---|
| Duplicate idempotency keys | `0` duplicates | pending | `<path>` | |
| Unassigned rejects | `0` open rejects without owner | pending | `<path>` | |
| Student-family link completeness | 无孤儿学生 | pending | `<path>` | 若 final table 未落库，记录为 `not-applicable` |
| Billing amount balance | `contract = invoice items`, `refund <= payment` | pending | `<path>` | |
| Teacher / campus / term mapping | 外键均可解释 | pending | `<path>` | |

## 4. Final Table Checks

说明：
- 当前仓库脚本只保证 `qa_staging.*` 写入与 artifact 生成。
- 若本批次同时做了正式业务表落库，请在此补充对应 SQL、截图与结论。

| Final Table Check | SQL / Method | Result | Evidence |
|---|---|---|---|
| `students.student_no` 唯一且可追溯 | `<fill-me>` | pending | `<path>` |
| `student_enrollments` 外键链完整 | `<fill-me>` | pending | `<path>` |
| `contracts/invoices/payments/refunds` 金额链一致 | `<fill-me>` | pending | `<path>` |

## 5. Decision

| Decision | Owner | Timestamp | Notes |
|---|---|---|---|
| `pass / conditional-pass / fail` | `<fill-me>` | `<fill-me>` | |
