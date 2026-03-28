# UAT 缺陷日志模板

> 用途：给 QA / PM / Tech on-call 在 UAT 现场直接登记缺陷并持续更新状态。

## 1. 使用规则

1. 每条 `fail` case 立即建一条缺陷，不等会后补。
2. 缺陷编号建议：`UAT-DEF-001`、`UAT-DEF-002`。
3. 同一现象若影响多个角色，可关联多个 `case_id`，但只保留一个主 defect。
4. `fixed` 不等于 `closed`；必须经过 QA 回归。

## 2. 建议目录

```text
release-workspace/
  wave4-uat-001/
    uat-defect-log.md
    screenshots/
    recordings/
```

## 3. 缺陷日志表

| defect_id | level | module | role | discovered_in_case | title | environment | steps_to_reproduce | expected_result | actual_result | impact_scope | owner | status | target_fix_time | fix_version_or_commit | retest_case | retest_result | evidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UAT-DEF-001 | P1 | homework | teacher | UAT-TE-02 | 复核保存后刷新丢数据 | uat | 1. 打开提交 2. 修改正确率 3. 保存 4. 刷新 | 保存后结果保留 | 刷新后回到旧值 | 教师主流程 | A7 | triaged | 2026-03-26 14:00 +08:00 | <fill-me> | UAT-TE-02 | pending | screenshots/teacher/UAT-TE-02-step4-fail.png | <fill-me> |

## 4. CSV Header

如需导入表格工具，可直接使用下面表头：

```csv
defect_id,level,module,role,discovered_in_case,title,environment,steps_to_reproduce,expected_result,actual_result,impact_scope,owner,status,target_fix_time,fix_version_or_commit,retest_case,retest_result,evidence,notes
```

## 5. 每轮 triage 必改字段

- `level`
- `owner`
- `status`
- `target_fix_time`
- `retest_case`

## 6. 关闭前必补字段

- `fix_version_or_commit`
- `retest_result`
- `evidence`
- `notes`
