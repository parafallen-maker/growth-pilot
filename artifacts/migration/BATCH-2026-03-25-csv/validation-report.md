# Migration Validation Report

- batchId: BATCH-2026-03-24
- sourceSystem: csv
- sourceFile: first-wave-sample.csv
- mode: validation-artifact
- inputPath: /Users/kgiot/.openclaw/workspace/.worktrees/growth-pilot/A10-IMPL-006/scripts/migration/samples/first-wave-sample.csv

## Plan 摘要
- rawRows: 5
- normalizedRows: 5
- readyToLoadRows: 3
- rejectedRows: 2

## Ready To Load Business Keys
- S-201
- S-201
- 

## Reject 分类统计
- FK_TEACHER_MISSING: 1
- FK_STUDENT_MISSING: 1
- DICT_SUBJECT_UNMAPPED: 1
- DICT_ERROR_TAXONOMY_UNMAPPED: 1
- BALANCE_CONTRACT_PAYABLE_MISMATCH: 1
- BALANCE_REFUND_EXCEEDS_PAYMENT: 1

## Reject 样例
### FK_TEACHER_MISSING
- 来源：2026上半学年每日作业完成质量表#4
- 业务键：S-404
- 字段：teacherName
- 原因：老师主数据未命中教师种子或正式表
- 建议：先补 teachers 映射后再回放
- Owner：A5/A6

### FK_STUDENT_MISSING
- 来源：2026上半学年每日作业完成质量表#4
- 业务键：S-404
- 字段：studentNo
- 原因：作业记录未命中 student 主档映射
- 建议：先完成 students/families/enrollments 主数据导入
- Owner：A5/A6

### DICT_SUBJECT_UNMAPPED
- 来源：2026上半学年每日作业完成质量表#4
- 业务键：S-404
- 字段：subjectRaw
- 原因：学科字典未命中标准 subject code
- 建议：补充 subject 映射表后重放
- Owner：A2/A6

### DICT_ERROR_TAXONOMY_UNMAPPED
- 来源：2026上半学年每日作业完成质量表#4
- 业务键：S-404
- 字段：errorTaxonomyRaw
- 原因：错因字典未命中标准 taxonomy code
- 建议：补错因映射字典或人工标注
- Owner：A2/A6

### BALANCE_CONTRACT_PAYABLE_MISMATCH
- 来源：历史账单表#6
- 业务键：
- 字段：payableAmountCents
- 原因：应收 payable 必须等于 total - discount
- 建议：修正合同金额链路后重放
- Owner：A7

## Final Load Order
1. teachers
2. families
3. students
4. student_enrollments
5. student_external_courses
6. devices
7. student_device_bindings
8. homework_submissions
9. homework_submission_files
10. homework_ai_analyses
11. homework_reviews
12. growth_observations
13. growth_observation_scores
14. contracts
15. invoices
16. payments
17. refunds

## 结论
- 本批次存在 reject，建议先修源数据/映射，再回放 final load。