# Migration Validation Report

- batchId: BATCH-2026-03-24
- sourceSystem: json
- sourceFile: first-wave-sample.json
- mode: validation-artifact
- inputPath: /Users/kgiot/.openclaw/workspace/.worktrees/growth-pilot/A10-IMPL-006/scripts/migration/samples/first-wave-sample.json

## Plan 摘要
- rawRows: 6
- normalizedRows: 6
- readyToLoadRows: 3
- rejectedRows: 3

## Ready To Load Business Keys
- S-101
- S-101
- I-101

## Reject 分类统计
- CONFLICT_STUDENT_NO: 1
- FK_TEACHER_MISSING: 1
- FK_STUDENT_MISSING: 1
- DICT_SUBJECT_UNMAPPED: 1
- DICT_ERROR_TAXONOMY_UNMAPPED: 1
- BALANCE_CONTRACT_PAYABLE_MISMATCH: 1
- BALANCE_REFUND_EXCEEDS_PAYMENT: 1

## Reject 样例
### CONFLICT_STUDENT_NO
- 来源：2026上半学年学生信息表#3
- 业务键：S-001
- 字段：studentNo
- 原因：同一 student_no 对应多个不同学生主体
- 建议：人工重编或补 old->new 编号映射
- Owner：A2/A5

### FK_TEACHER_MISSING
- 来源：2026上半学年每日作业完成质量表#5
- 业务键：S-404
- 字段：teacherName
- 原因：老师主数据未命中教师种子或正式表
- 建议：先补 teachers 映射后再回放
- Owner：A5/A6

### FK_STUDENT_MISSING
- 来源：2026上半学年每日作业完成质量表#5
- 业务键：S-404
- 字段：studentNo
- 原因：作业记录未命中 student 主档映射
- 建议：先完成 students/families/enrollments 主数据导入
- Owner：A5/A6

### DICT_SUBJECT_UNMAPPED
- 来源：2026上半学年每日作业完成质量表#5
- 业务键：S-404
- 字段：subjectRaw
- 原因：学科字典未命中标准 subject code
- 建议：补充 subject 映射表后重放
- Owner：A2/A6

### DICT_ERROR_TAXONOMY_UNMAPPED
- 来源：2026上半学年每日作业完成质量表#5
- 业务键：S-404
- 字段：errorTaxonomyRaw
- 原因：错因字典未命中标准 taxonomy code
- 建议：补错因映射字典或人工标注
- Owner：A2/A6

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