# 20 DDL 与迁移校核报告

> 目的：校核 `05_数据库DDL.sql` 是否已经具备 Wave 1 可用的 baseline 条件，并提前拆掉会影响幂等、唯一性、迁移稳定性的雷。

---

## 1. 总体结论

当前 DDL 主体可用，核心主对象覆盖完整，已经具备作为 **V1 baseline** 的基础。

覆盖范围包括：
- 平台基础与组织权限
- 教师 / 学生 / 家庭主数据
- 作业与 AI 复核链路
- 成长观察与目标链路
- 出勤与设备链路
- 收费与退款链路
- 沟通与消息链路
- Analytics / operation_logs / staging 相关支撑

但在 Wave 0 校核中，仍发现若干会影响 **幂等、唯一性、主联系人语义、活动绑定唯一性、异步任务去重** 的设计缺口。已在本轮 DDL 中直接补齐。

---

## 2. 主对象校核结论

| 领域 | 主要对象 | 结论 |
|---|---|---|
| 组织权限 | users / roles / permissions / user_roles | 主体完整，补了空校区唯一性问题 |
| 主数据 | teachers / students / families / guardians / enrollments | 主体完整，补了家庭主联系人唯一性 |
| 作业 | homework_submissions / homework_ai_analyses / homework_reviews | 主链路完整，补了复核错因唯一性 |
| 成长 | rubric / observation / goal / report | 主体完整 |
| 出勤 | devices / student_device_bindings / attendance_events | 主体完整，补了活动绑定与设备事件去重 |
| 收费 | products / contracts / invoices / payments / refunds | 主体完整，补了 payment 幂等键唯一性 |
| 异步任务 | ai_jobs | 主体完整，补了活动任务去重 |

---

## 3. 本轮已修复的关键 DDL 问题

## 3.1 `user_roles`
### 问题
原设计使用 `UNIQUE (user_id, role_id, campus_id)`。在 PostgreSQL 中，`campus_id IS NULL` 时会允许多条重复记录，无法覆盖“全局角色”场景下的唯一性。

### 处理
改为索引策略：
- `campus_id IS NULL` 时使用部分唯一索引
- `campus_id IS NOT NULL` 时使用组合唯一索引

### 结果
同时支持：
- 全局角色唯一
- 校区级角色唯一

---

## 3.2 `attendance_events`
### 问题
原唯一约束是 `(student_id, event_type, event_time)`，与后端规格要求的 `(device_id, event_time, event_type)` 去重语义不一致。

### 处理
移除原表内唯一约束，改为部分唯一索引：
- `device_id IS NOT NULL` 时，对 `(device_id, event_time, event_type)` 去重

### 结果
与设备事件采集的幂等策略保持一致。

---

## 3.3 `homework_review_error_items`
### 问题
同一条复核可能重复写入同一标准错因。

### 处理
增加 `UNIQUE (review_id, error_taxonomy_id)`。

### 结果
避免重复错因污染统计口径。

---

## 3.4 `guardians`
### 问题
一个家庭可能出现多个 `is_primary = true` 的主联系人。

### 处理
增加部分唯一索引：
- 每个家庭仅允许一个主联系人

### 结果
家庭主联系人语义稳定，可直接服务收费与沟通。

---

## 3.5 `student_device_bindings`
### 问题
同一学生可被多个活动设备同时绑定，或同一设备同时绑定多个活动学生。

### 处理
增加两个部分唯一索引：
- active 学生唯一活动绑定
- active 设备唯一活动绑定

### 结果
活动绑定关系不再歧义。

---

## 3.6 `ai_jobs`
### 问题
同一业务对象在 `queued/running` 状态下可能重复建同类任务。

### 处理
增加部分唯一索引：
- `(job_type, biz_type, biz_id)` 在活动状态下唯一

### 结果
符合后端“活动任务禁止重复创建”的约束。

---

## 3.7 `payments`
### 问题
`idempotency_key` 存在字段，但缺少唯一性约束。

### 处理
增加部分唯一索引：
- `idempotency_key IS NOT NULL` 时唯一

### 结果
支付写入具备明确幂等抓手。

---

## 4. 迁移顺序建议

建议历史数据导入按下列顺序执行：

1. `campuses / school_terms / users / teachers`
2. `families / guardians / students`
3. `student_enrollments / student_external_courses / student_tags`
4. `devices / student_device_bindings`
5. `homework_submissions / homework_ai_analyses / homework_reviews / homework_review_error_items`
6. `growth_observations / growth_goals / growth_goal_checkins`
7. `billing_products / contracts / invoices / payments / refunds`
8. `communication_records / message_tasks`
9. `kpi_daily_snapshots` 等分析型数据

---

## 5. staging 导入策略

历史导入不要直接写正式表，采用三层策略：

### 5.1 raw staging
- 原始表整表落入 `staging_*`
- 不做业务解释，只保留源字段与来源表信息

### 5.2 normalized staging
- 做字段清洗、时间格式修正、空值统一、枚举映射
- 保留原值与标准值对照

### 5.3 final load
- 做主键映射、去重、外键校验后写入正式表
- 对失败行输出 reject report

### reject report 必须包含
- 源表名
- 源行号 / 源业务主键
- 失败字段
- 失败原因
- 建议处理方式

---

## 6. 建议 A10 优先验证的迁移风险

1. `school_terms.code` 是否存在历史撞码
2. `students.student_no` 是否存在跨学期或跨校区重复
3. `teachers.employee_no` 是否存在重复或空值
4. 历史设备绑定是否存在一机多绑
5. 历史支付链路是否缺 invoice / contract 外键
6. 历史错因、学科、枚举字典是否存在无法映射项

---

## 7. 本轮 DDL 修改摘要

已在 `05_数据库DDL.sql` 中补充：
- `user_roles` 部分唯一索引（null campus / 非 null campus）
- `attendance_events` 设备事件去重索引
- `homework_review_error_items` 唯一约束
- `guardians` 主联系人唯一索引
- `student_device_bindings` 活动绑定唯一索引
- `ai_jobs` 活动任务去重索引
- `payments` 幂等键唯一索引

---

## 8. 仍需后续收口的问题

### 给 A3
- 同步 OpenAPI / DTO / 错误语义
- 明确 `source_type`、attendance 幂等语义
- 收口编号字段的唯一性口径（全局唯一 vs 校区内唯一）

### 给 A4
- 把当前 DDL 固化为数据库 V1 baseline migration
- jobs 模块直接利用活动任务去重索引

### 给 A10
- 基于 staging 策略准备 reject report 模板
- 先做编号冲突和外键缺失验证

---

## 9. 一句话判断

**这轮不是在“多补几个索引”，而是在把数据库从“看起来能用”拽到“上线时不容易炸”。**
