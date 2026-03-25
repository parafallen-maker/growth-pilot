# 01 范围与设计原则

## 1. 从现有 Excel 抽取出来的业务骨架
现有多维表格已经形成了 5 条非常清晰的业务链：

1. **学生主档案链**  
   学生姓名、年级、负责老师、学期在读信息、离校原因。

2. **作业分析链**  
   日期 → 学生 → 科目 → 图片上传 → AI 输出 → 正确率 → 文本错因 → 预警状态。

3. **习惯观察链**  
   准时性、整洁度、专注力、自主思考、礼貌沟通、物品整理等 1~5 分维度观察。

4. **学习时长链**  
   设备签到 / 学习开始结束时间 / 学科 / 经过时间。

5. **设备绑定链**  
   学生编号 ↔ 设备 SN。

新系统不推翻这套模式，而是把它**标准化、关系化、可运营化**：
- 把“表”改成“实体 + 流程”
- 把“文本结果”改成“结构化记录 + 可复核”
- 把“单点统计”改成“学生 360 / 家庭 360 / 教师 360”
- 把“人工追踪”改成“任务 / 预警 / 周报闭环”

## 2. 本次系统范围
### 2.1 In Scope
- 学生主数据
- 家庭/监护人管理
- 教师管理
- 学期在读与教师分配
- 作业上传、AI 分析、教师复核、错因标准化
- 学习习惯评分、成长目标、周报
- 签到离校、设备绑定、学习时长
- 收费方案、合同、账单、收款、退费
- 任务中心、预警中心
- 设置中心（年级、科目、错因标签、评分规则、收费项目）
- 数据分析（学生、教师、收费）

### 2.2 Out of Scope
- 法律合规专题页
- 心理筛查、量表、心理档案
- 招生 CRM
- 独立家长端 App / 小程序（本期只做后台）
- 排课系统（本期只做学生归属与教师分配，不做复杂排课）

## 3. 设计总原则
| 原则 | 后台系统落地方式 | 对数据结构的要求 |
| --- | --- | --- |
| 以成长为主线，不以打分为主线 | 学生 360 页面按“作业 / 习惯 / 时长 / 家庭 / 收费”组织，而不是按表组织 | 学生是主实体，其他模块全部可回挂学生 |
| AI 只做草稿，不做最终裁决 | AI 分析结果与教师复核结果分表保存 | `homework_ai_analyses` 与 `homework_reviews` 分离 |
| 家校协同必须可执行 | 家庭 360、联系记录、周报、家庭配合建议 | `families` / `guardians` / `family_contact_logs` / `weekly_reports` |
| 教师要被系统支持，而不是被系统压榨 | 教师中心看工作量、学生分布、复盘、培训任务 | `teacher_assignments` / `teacher_reviews` / `teacher_training_records` |
| 预警服务于支持动作 | 预警与任务联动，不做纯展示 | `alerts` + `tasks` |
| 所有内容最终可分析 | 关键节点必须结构化字段化 | 正确率、错因标签、习惯维度分、时长、账单状态必须结构化 |
| 一切可迁移 | Excel 旧表可以幂等导入 | `student_no`、`contract_no`、`invoice_no`、日期维度保持稳定键 |

## 4. 采用的教育理念（用于功能设计，不是写进宣传文案）
### 4.1 CASEL：关系、目标、责任与家校共同体
系统中的“成长目标”“教师评语”“家庭配合建议”“礼貌沟通/自主思考”等模块，借鉴的是社会情绪学习里关于**自我管理、关系技能、负责任决策、学校-家庭共同体**的结构化思路。

**系统落地：**
- 目标不是只记录“对/错”，而是记录“如何变好”
- 习惯评分维度优先覆盖专注、整洁、自主思考、沟通
- 周报模板固定包含：表现、进步、下一步、家庭建议

### 4.2 UDL：面向差异化学习者
系统不假设“所有学生都一样”，因此在作业复核与成长目标里保留：
- 个体化错因标签
- 个体化支持建议
- 不同学生不同目标周期
- 同一指标允许文本说明和量化并存

**系统落地：**
- 错因标签与教师建议分开存
- 目标不是学科统一模板，而是学生自定义
- 每条周报都允许教师手动改写 AI 草稿

### 4.3 PBIS/分层支持：先普遍支持，再重点跟进
预警系统不做心理筛查，只做**学习与行为支持的分层运营**：
- 正常：归档
- 需关注：自动入预警池
- 待辅导：自动生成人工任务
- 完全未掌握/连续低表现：升级为重点任务

**系统落地：**
- `homework_reviews.risk_level`
- `alerts`
- `tasks`
- 教师工作台显示待处理学生与逾期任务

### 4.4 元认知/自我调节学习
系统中的“自主思考能力”“成长目标”“周报反思”“教师建议”，不是附属文本，而是为了支持学生形成：
- 计划
- 监控
- 反思
- 修正

**系统落地：**
- 目标有 `success_criteria`
- 跟进有 `progress_percent`
- 周报中保留“下周建议”
- 教师复核页提供“下一步动作”

### 4.5 家长参与不是通知，而是协同动作
家庭管理模块不只保存电话，而是保存：
- 谁是主联系人
- 最近一次沟通了什么
- 下次何时继续跟进
- 家长可执行的家庭配合建议

**系统落地：**
- `guardians.is_primary`
- `family_contact_logs.next_contact_at`
- `weekly_reports.family_suggestion`

## 5. 风险规则（非心理筛查版）
### 5.1 作业风险
建议默认规则：
- `normal`：正确率 >= 90 且无高风险错因
- `watch`：正确率 75~89 或 7 天内同类错因重复 3 次
- `coaching`：正确率 60~74 或出现“方法未掌握 / 完全未掌握”
- `critical`：正确率 < 60 或 7 天内连续 2 次 `coaching`

### 5.2 收费风险
- `billing_watch`：距离应收日 <= 3 天且未付款
- `billing_overdue`：逾期未付款
- `billing_high`：逾期 > 15 天

### 5.3 成长风险
- 30 天内习惯总分均值持续下降
- 自主思考能力维度连续低分
- 学习时长异常波动且作业正确率同步下降

## 6. 本版最重要的产品判断
1. **学生档案表不是一张表，而是一张实时生成的汇总视图。**
2. **作业分析的中心不是 AI，而是教师复核。**
3. **家庭管理的中心不是联系方式，而是协同记录。**
4. **教师管理的中心不是人事资料，而是学生支持能力与工作负载。**
5. **收费模块必须跟学生、家庭、学期、合同打通，不能做成孤立财务表。**

## 7. 参考依据（给产品/研发理解设计来源）
> 以下链接用于说明为什么系统这样设计；不是法律或合规要求。

- CASEL Framework  
  https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/

- Universal Design for Learning（CAST）  
  https://www.cast.org/resources/about-universal-design-for-learning/

- PBIS Tiered Support  
  https://www.pbis.org/pbis/what-is-pbis

- EEF: Parental Engagement  
  https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/parental-engagement/

- EEF: Metacognition and Self-regulation  
  https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation/

- EEF: Oral Language Interventions  
  https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/oral-language-interventions

- EEF: Feedback  
  https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/feedback

## 8. 使用这些研究时的原则
- 这些研究或框架是**设计参考**，不是保证结果的承诺。
- 系统应该把“最佳实践”变成“可执行流程”，而不是把理论写成口号。
- 任何效果最终仍以本机构自己的数据验证为准。
