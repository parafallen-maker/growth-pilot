# 09 现有 Excel 数据迁移说明

## 1. 目标
把现有 Excel 中已经沉淀的数据迁移到新系统，并保证：
- 可重复执行（幂等）
- 先迁基础表，再迁事实表
- 不把“汇总表”当成源表
- 允许历史数据不完整

## 2. 当前工作簿概况
> 下表为本次读取到的工作表概况，行数包含表头。

| 工作表 | 行数(含表头) | 数据行 |
| --- | --- | --- |
| 学生档案表 | 52 | 51 |
| 2025下半学年学生信息表 | 38 | 37 |
| 2026上半学年学生信息表 | 35 | 34 |
| 2025下半学年每日作业完成质量表 | 2613 | 2612 |
| 2026上半学年每日作业完成质量表 | 1187 | 1186 |
| 2026上半学年学习习惯评分表 | 2 | 1 |
| 2026每日作业时间统计表 | 2 | 1 |
| 作业时间统计表 | 1 | 0 |
| 设备签到记录表 | 2 | 1 |
| 作业时间记录设备绑定表 | 62 | 61 |

## 3. 核心判断
### 3.1 哪些表是源表
以下工作表应视为**源表**：
- `2025下半学年学生信息表`
- `2026上半学年学生信息表`
- `2025下半学年每日作业完成质量表`
- `2026上半学年每日作业完成质量表`
- `2026上半学年学习习惯评分表`
- `2026每日作业时间统计表`
- `作业时间统计表`
- `设备签到记录表`
- `作业时间记录设备绑定表`

### 3.2 哪些表不是源表
`学生档案表` 应视为**汇总视图**，不是标准化源表。  
原因：
- 同一单元格内存了日期列表
- 既包含学生基本信息，也包含汇总结果
- 新系统里它应由多个标准表实时聚合生成

## 4. 工作表到目标表映射
| Excel 工作表 | 目标表 | 说明 |
| --- | --- | --- |
| 2025下半学年学生信息表 | `students` + `student_enrollments` + `teachers` + `families` | 2025 下半学期在读信息 |
| 2026上半学年学生信息表 | `students` + `student_enrollments` + `teachers` + `families` | 2026 上半学期在读信息 |
| 学生档案表 | 不直接导入 | 迁移后由学生 360 聚合替代 |
| 2025下半学年每日作业完成质量表 | `homework_submissions` + `homework_assets` + `homework_ai_analyses` + `homework_reviews` + `homework_review_tags` | 历史作业主事实表 |
| 2026上半学年每日作业完成质量表 | 同上 | 历史作业主事实表 |
| 2026上半学年学习习惯评分表 | `habit_observations` + `habit_observation_scores` | 习惯观察 |
| 2026每日作业时间统计表 | `study_sessions` | 新版时长表 |
| 作业时间统计表 | `study_sessions` | 旧版时长表 |
| 设备签到记录表 | `checkin_logs` | 签到离校 |
| 作业时间记录设备绑定表 | `devices` + `device_bindings` | 学生设备绑定 |

## 5. Excel 字段映射细则

### 5.1 学生信息表 → students / student_enrollments
**源字段**
- 学生姓名
- 年级
- 负责老师
- 家长联系方式
- 入学日期
- 是否单亲
- 在外补习情况
- 照片
- 离校日期
- 离校原因

**目标映射**
| 源字段 | 目标字段 | 备注 |
| --- | --- | --- |
| 学生姓名 | `students.name` | 核心识别字段之一 |
| 年级 | `students.grade_level_id` | 通过 `grade_levels.code` 映射 |
| 负责老师 | `teachers.name` | 若不存在则先创建教师 |
| 家长联系方式 | `guardians.mobile` | 历史数据可能为空 |
| 入学日期 | `student_enrollments.enroll_date` | Excel 序列日期需转换 |
| 离校日期 | `student_enrollments.leave_date` | 为空则表示仍在读 |
| 离校原因 | `student_enrollments.leave_reason` | 直接迁移 |
| 照片 | `students.avatar_url` | 若原文件已丢失，可留空 |
| 是否单亲 / 在外补习情况 | `students.notes` 或 `student_labels` | 先作为备注/标签，不额外拆表 |

**迁移规则**
- 以 `学生姓名 + 学期` 作为临时匹配键。
- 正式写入时，生成稳定 `student_no`。
- 同一学生跨学期复用同一 `students` 记录，不重复建学生。

### 5.2 作业完成质量表 → homework_submissions / homework_ai_analyses / homework_reviews
**源字段**
- 日期
- 学生姓名
- 科目
- 作业上传
- 豆包输出
- 正确率
- 文本错因
- 数字正确率
- 标准错因
- 预警状态

**目标映射**
| 源字段 | 目标字段 | 备注 |
| --- | --- | --- |
| 日期 | `homework_submissions.submitted_on` | Excel 序列日期需转换 |
| 学生姓名 | `homework_submissions.student_id` | 通过学生匹配 |
| 科目 | `homework_submissions.subject_id` | 通过 `subjects` 映射 |
| 作业上传 | `homework_assets.file_url/file_name` | 逗号分隔的多文件拆多行 |
| 豆包输出 | `homework_ai_analyses.raw_result_md` | 原样保存 |
| 正确率 | `homework_ai_analyses.overall_accuracy` | 百分号转 numeric |
| 文本错因 | `homework_ai_analyses.normalized_error_summary` | 原始摘要保留 |
| 数字正确率 | `homework_ai_analyses.text_accuracy` | 沿用现有列，后续可重命名 |
| 预警状态 | `homework_reviews.risk_level` | 需做状态映射 |

**预警状态映射**
| Excel 值 | 系统值 |
| --- | --- |
| 正常 | `normal` |
| 需关注 | `watch` |
| 待辅导 | `coaching` |
| 完全未掌握 | `critical` |

**错因标签映射**
Excel 中的“文本错因”经常是多值逗号串，应拆分后映射到标准标签：
- 概念混淆 → `concept_confusion`
- 知识混淆 → `knowledge_confusion`
- 审题偏差 → `misread_question`
- 计算失误 → `calculation_error`
- 步骤缺失 → `missing_steps`
- 遗漏作答 → `incomplete_answer`
- 方法未掌握 → `method_not_mastered`
- 表述不清 → `expression_unclear`
- 书写潦草 / 书写粗心 → `handwriting_issue`
- 非知识性错误 → `careless_error`
- 完全未掌握 → `not_mastered`
- 无 / 无知识性错误 → `no_error`

**导入策略**
- 每一行 Excel 作业记录对应 1 条 `homework_submissions`
- 附件字段按逗号拆分成多条 `homework_assets`
- AI 结果写入 1 条 `homework_ai_analyses`
- 历史数据没有人工复核时，也建议补 1 条 `homework_reviews`，来源标记为“migrated”
- 错因多值拆分写入 `homework_review_tags`

### 5.3 学习习惯评分表 → habit_observations / habit_observation_scores
**源字段**
- 日期
- 学生姓名
- 准时性 / 数值
- 整洁度 / 数值
- 专注力 / 数值
- 自主思考能力 / 数值
- 礼貌沟通 / 数值
- 物品整理 / 数值
- 综合评分

**迁移规则**
- 1 行 Excel = 1 条 `habit_observations`
- 每个维度数值单独写 1 条 `habit_observation_scores`
- `综合评分` 若为空，则按维度均值计算后补写 `habit_observations.total_score`
- 维度描述文本（如“2分（多次催促，明显拖拉）”）可写进 `note`

### 5.4 学习时长表 → study_sessions
**源字段**
- 学生姓名 / 姓名
- 日期
- 学科
- 开始时间
- 结束时间
- 经过时间
- 经过时间数值
- 设备 SN

**迁移规则**
- 有开始/结束时间：优先写 `start_at` / `end_at`
- 有 `经过时间数值`：直接写 `duration_minutes`
- 没有数值时，可解析 `经过时间` 文本转分钟
- 科目需映射到 `subjects`
- 设备 SN 先匹配 `devices`

### 5.5 设备签到表 → checkin_logs
**源字段**
- 学生姓名
- 设备 SN
- 签到时间

**迁移规则**
- 只记录签到时，`checkout_at` 可为空
- `attendance_status` 默认为 `checked_in`
- 后续若存在离校数据，再补 `checkout_at`

### 5.6 设备绑定表 → devices / device_bindings
**源字段**
- 学生编号
- 学生姓名
- 设备 SN

**迁移规则**
- `设备 SN` 为空时可跳过
- 同一 SN 不重复创建设备
- 绑定关系按 `student_id + device_id + bind_from` 幂等

## 6. Excel 序列日期处理
当前工作簿中有多处日期以 Excel 序列数保存，例如 `46083`。  
迁移时统一使用以下规则转换：

```sql
date '1899-12-30' + excel_serial::int
```

示例：
```sql
select date '1899-12-30' + 46083; -- 2026-03-01
```

## 7. 迁移顺序
1. 初始化字典表：年级、科目、错因标签、习惯维度、收费项目
2. 导入教师
3. 导入家庭与监护人
4. 导入学生
5. 导入学期
6. 导入学期在读记录
7. 导入设备与设备绑定
8. 导入作业、附件、AI 结果、复核结果
9. 导入习惯观察
10. 导入学习时长
11. 导入签到记录
12. 迁移后生成学生 360 聚合缓存（如有）

## 8. 幂等规则
### 8.1 学生
- 唯一键优先：`student_no`
- 迁移阶段临时键：`name + family/mobile + first_enroll_term`

### 8.2 作业
建议唯一键：
- `student_id + submitted_on + subject_id + first_asset_file_name`

### 8.3 设备
- `devices.sn` 唯一

### 8.4 账单/合同
- `contract_no`
- `invoice_no`

## 9. 清洗规则
- 去除前后空格
- 全角括号统一
- 百分号去掉 `%` 后转 numeric
- 逗号分隔字段统一按 `,` 和 `，` 同时切分
- 空字符串转 null
- 教师名、科目名、年级名在导入前先标准化映射

## 10. 推荐导入脚本形态
```text
scripts/import/
  import_teachers.ts
  import_families_students.ts
  import_enrollments.ts
  import_devices.ts
  import_homework.ts
  import_habits.ts
  import_sessions.ts
  import_checkins.ts
```

## 11. 导入脚本伪代码
```ts
for row in excelRows:
  student = upsertStudent(...)
  enrollment = upsertEnrollment(...)
  submission = upsertHomeworkSubmission(...)
  assets = upsertHomeworkAssets(...)
  ai = upsertAiAnalysis(...)
  review = upsertHomeworkReview(...)
  tags = syncHomeworkReviewTags(...)
```

## 12. 迁移完成后的核对项
- 学生总数是否与学期信息表去重后相符
- 教师人数是否与表格中的教师名集合相符
- 作业总量是否与两张作业质量表数据行数相符
- 有附件的作业数量是否大致正确
- 设备 SN 去重后数量是否合理
- 学生 360 中随机抽样核对 10 个学生

## 13. 不建议迁移的内容
- 学生档案表里已经聚合好的日期字符串
- 任何重复统计字段
- 无法确认来源的手工汇总结论

## 14. 最终原则
新系统只迁移“事实”，不迁移“旧汇总”。  
迁移完成后，所有汇总都由数据库查询和聚合接口实时生成。
