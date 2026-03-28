# UAT 缺陷分级、流转与放行规则模板

> 用途：让 QA / PM / Owner 用同一把尺子判缺陷，不靠拍脑袋放行。

## 1. 使用方式

1. 所有 `fail` case 先登记到缺陷日志，再讨论优先级。
2. 每个角色执行结束后立刻做一次 mini triage。
3. 当天收场前汇总开放缺陷，更新放行结论。
4. 只有 defect log、回归结果、signoff 三者一致时，才允许写 `pass` 或 `conditional-pass`。

## 2. 缺陷分级

| 级别 | 定义 | 典型例子 | 放行要求 |
|---|---|---|---|
| `P0 / blocker` | 主流程断裂、数据错乱、权限失控、无法上线/无法回滚 | 登录失败、金额错误、越权查看账单、重复主档 | 必须清零 |
| `P1 / major` | 主流程可绕过但不可接受，或影响大面积用户 | 教师复核保存偶发失败、学生 360 关键 tab 缺数据 | 原则上清零；若条件放行需 owner 书面确认 |
| `P2 / minor` | 局部交互、边界、提示或非关键流程问题 | 筛选状态回显异常、提示文案错误 | 允许放行，但必须有修复排期 |
| `P3 / suggestion` | 优化项、体验项、文案/布局微问题 | 排版不齐、文案不统一 | 记录即可，不阻塞上线 |

### 分级细化说明

#### P0
- 主流程断裂：登录、建档、homework、growth、billing 无法完成
- 数据错乱：状态机错写、金额错误、重复主档、不可逆脏数据
- 权限失控：越权查看/编辑/支付
- 发布阻断：无法上线或无法回滚

#### P1
- 核心功能可绕过但不可接受
- 大面积用户受影响
- 关键页面错误提示/状态错误，显著影响业务连续性

#### P2
- 局部交互、边界、样式、提示问题
- 有 workaround，不阻断主流程

#### P3
- 优化项、体验项、文案/布局微问题

## 3. 缺陷状态流

标准状态：

```text
new -> triaged -> in_progress -> fixed -> retest -> closed
```

补充状态：
- `rejected`：非缺陷、重复、使用错误
- `deferred`：确认存在，但不在当前发布窗口修
- `blocked`：依赖外部环境、账号、数据才能修或回归

状态规则：
- `new` 必须有最小复现信息。
- `triaged` 必须补齐级别、owner、目标修复时间。
- `fixed` 只代表开发完成，不代表已关闭。
- `closed` 必须有 QA 回归证据。

## 4. 缺陷清单

| defect_id | title | level | module | env | steps | expected | actual | owner | status | target_fix | regression_case |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | 示例：payment status 未回写 | P0 | billing | preprod | ... | ... | ... | A7 | open | 2026-03-26 | billing.e2e |

## 5. Triage 会议流程

每轮 triage 固定 10 分钟内完成：

| 步骤 | 负责人 | 输出 |
|---|---|---|
| QA 复述现象与影响 | QA lead | 是否接受为有效缺陷 |
| 技术判断原因范围 | Tech on-call | 数据 / 配置 / 代码 / 使用方式 |
| PM 判断业务影响 | PM | 是否阻断角色签收 |
| Owner 定级与优先级 | PM / Owner | `P0/P1/P2/P3` |
| QA 回写 defect log | Recorder / QA | owner、状态、SLA、回归 case |

不允许在 triage 会上做的事：
- 现场长时间 debug
- 不建单只在群里口头分配
- 未定级就承诺上线

## 6. 修复 SLA

| 级别 | 修复要求 | 回归要求 |
|---|---|---|
| `P0` | 当天修复并回归 | 必须回归原 case + 相邻主流程 |
| `P1` | 放行前关闭；若条件放行需书面接受 | 必须回归原 case |
| `P2` | 写入 backlog 并给出明确日期 | 可合并回归 |
| `P3` | 记录并排期 | 可不在本轮回归 |

## 7. 缺陷日志最少字段

建议搭配 `docs/growthpilot/templates/uat_defect_log_template.md` 使用。

每条缺陷至少包含：
- `defect_id`
- `title`
- `level`
- `module`
- `environment`
- `discovered_in_case`
- `steps_to_reproduce`
- `expected_result`
- `actual_result`
- `impact_scope`
- `owner`
- `status`
- `target_fix_time`
- `fix_version_or_commit`
- `retest_case`
- `retest_result`
- `evidence`

## 8. 放行规则

- [ ] `P0 = 0`
- [ ] `P1 = 0` 或 owner 已书面接受条件放行
- [ ] 所有 `fail` case 都已绑定 defect id
- [ ] 所有 `blocked` case 都有解决计划或明确不纳入本轮范围
- [ ] `P2` 已登记并有明确修复排期
- [ ] `P3` 不阻塞上线
- [ ] 回归覆盖本次 release 受影响模块
- [ ] 回滚方案、备份记录、负责人齐全

## 9. 条件放行模板

```markdown
结论：conditional-pass

原因：
- 无 P0 未关闭项
- P1/P2 已评估影响范围，不阻断本次核心主流程
- owner 已接受已知限制和 workaround
- P2/P3 若干已知问题不阻断主流程

上线前要求：
- 已完成备份
- 已确认观察窗口负责人
- 已准备回滚路径
- 已把已知问题同步到发布验收报告
```

## 10. 不放行模板

```markdown
结论：fail / no-go

阻塞原因：
- 存在未关闭 P0/P1
- 主流程成功率不足
- 数据一致性 / 金额 / 权限仍存在不可接受风险
- 回滚路径未验证，或发布后不可恢复
```

## 11. 回归关闭模板

```markdown
回归结论：closed
缺陷编号：DEF-xxx
回归人：<name>
回归时间：<YYYY-MM-DD HH:mm +08:00>
回归 case：<case-id>
证据：<path/link>
备注：修复版本 <commit/tag>
```
