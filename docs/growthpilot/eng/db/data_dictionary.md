# 数据字典

## 说明

- 主键统一使用 `uuid`。
- 业务金额统一使用 `numeric(12,2)`。
- 百分比使用 `numeric(5,2)`，范围 0-100。
- 时间字段统一为 `timestamptz`，日期字段为 `date`。
- 表命名使用小写复数 snake_case，接口与前端字段保持一致。


## organizations

> 机构主表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| name | varchar(100) | 是 |  | 机构名称 |
| code | varchar(40) | 是 |  | 机构编码 |
| status | varchar(20) | 是 | 'active' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`code`


## campuses

> 校区表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| organization_id | uuid | 是 |  | 所属机构；引用 organizations.id |
| name | varchar(100) | 是 |  | 校区名称 |
| code | varchar(40) | 是 |  | 校区编码 |
| phone | varchar(30) | 否 |  | 联系电话 |
| address | varchar(255) | 否 |  | 地址 |
| status | varchar(20) | 是 | 'active' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`code`
- 常用索引：`organization_id`


## terms

> 学期表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| campus_id | uuid | 否 |  | 校区；引用 campuses.id |
| name | varchar(100) | 是 |  | 学期名称 |
| term_type | varchar(20) | 是 | 'semester' | 学期类型 |
| start_date | date | 是 |  | 开始日期 |
| end_date | date | 是 |  | 结束日期 |
| status | varchar(20) | 是 | 'planned' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`campus_id`；`status`


## users

> 系统用户表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| username | varchar(60) | 是 |  | 登录名 |
| display_name | varchar(60) | 是 |  | 显示名 |
| mobile | varchar(20) | 否 |  | 手机号 |
| email | varchar(120) | 否 |  | 邮箱 |
| password_hash | text | 否 |  | 密码哈希 |
| status | varchar(20) | 是 | 'active' | 状态 |
| last_login_at | timestamptz | 否 |  | 最近登录时间 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`username`


## roles

> 角色表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(40) | 是 |  | 角色编码 |
| name | varchar(60) | 是 |  | 角色名称 |
| description | text | 否 |  | 角色描述 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 唯一约束：`code`


## user_roles

> 用户角色关联表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| user_id | uuid | 是 |  | 用户ID；引用 users.id |
| role_id | uuid | 是 |  | 角色ID；引用 roles.id |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`user_id, role_id`
- 常用索引：`role_id`


## grade_levels

> 年级字典

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(30) | 是 |  | 编码 |
| name | varchar(30) | 是 |  | 名称 |
| sort_order | integer | 是 | 0 | 排序 |
| is_active | boolean | 是 | true | 是否启用 |

- 主键：`id`
- 唯一约束：`code`


## subjects

> 科目字典

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(30) | 是 |  | 编码 |
| name | varchar(30) | 是 |  | 名称 |
| sort_order | integer | 是 | 0 | 排序 |
| is_active | boolean | 是 | true | 是否启用 |

- 主键：`id`
- 唯一约束：`code`


## error_tags

> 标准错因字典

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(40) | 是 |  | 编码 |
| name | varchar(60) | 是 |  | 名称 |
| category | varchar(40) | 是 |  | 类别 |
| default_risk_level | varchar(20) | 是 | 'medium' | 默认风险等级 |
| description | text | 否 |  | 说明 |
| sort_order | integer | 是 | 0 | 排序 |
| is_active | boolean | 是 | true | 是否启用 |

- 主键：`id`
- 唯一约束：`code`
- 常用索引：`category`


## habit_dimensions

> 习惯维度字典

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(40) | 是 |  | 编码 |
| name | varchar(60) | 是 |  | 名称 |
| description | text | 否 |  | 说明 |
| score_min | integer | 是 | 1 | 最低分 |
| score_max | integer | 是 | 5 | 最高分 |
| sort_order | integer | 是 | 0 | 排序 |
| is_active | boolean | 是 | true | 是否启用 |

- 主键：`id`
- 唯一约束：`code`


## fee_items

> 收费项目字典

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| code | varchar(40) | 是 |  | 编码 |
| name | varchar(60) | 是 |  | 名称 |
| category | varchar(40) | 是 |  | 类别 |
| unit | varchar(20) | 是 | '次' | 单位 |
| default_price | numeric(12,2) | 是 | 0 | 默认单价 |
| is_active | boolean | 是 | true | 是否启用 |

- 主键：`id`
- 唯一约束：`code`
- 常用索引：`category`


## families

> 家庭主表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| family_no | varchar(40) | 是 |  | 家庭编号 |
| family_name | varchar(100) | 是 |  | 家庭名称 |
| address | varchar(255) | 否 |  | 家庭地址 |
| notes | text | 否 |  | 备注 |
| status | varchar(20) | 是 | 'active' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`family_no`


## guardians

> 监护人表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| name | varchar(60) | 是 |  | 姓名 |
| relation | varchar(30) | 是 |  | 与学生关系 |
| mobile | varchar(20) | 否 |  | 手机号 |
| wechat | varchar(60) | 否 |  | 微信号 |
| occupation | varchar(60) | 否 |  | 职业 |
| is_primary | boolean | 是 | false | 是否主联系人 |
| is_emergency | boolean | 是 | false | 是否紧急联系人 |
| pickup_priority | integer | 是 | 0 | 接送优先级 |
| notes | text | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`family_id`；`mobile`


## students

> 学生主表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_no | varchar(40) | 是 |  | 学生编号 |
| name | varchar(60) | 是 |  | 学生姓名 |
| gender | varchar(10) | 否 |  | 性别 |
| birth_date | date | 否 |  | 生日 |
| grade_level_id | uuid | 否 |  | 当前年级；引用 grade_levels.id |
| school_name | varchar(120) | 否 |  | 学校 |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| status | varchar(20) | 是 | 'active' | 状态 |
| avatar_url | text | 否 |  | 头像URL |
| notes | text | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`student_no`
- 常用索引：`family_id`；`grade_level_id`；`status`；`name`


## student_labels

> 学生标签表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| label | varchar(40) | 是 |  | 标签名 |
| color | varchar(20) | 否 |  | 颜色 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`student_id`；`label`


## teachers

> 教师主表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| user_id | uuid | 否 |  | 关联用户；引用 users.id |
| teacher_no | varchar(40) | 是 |  | 教师编号 |
| name | varchar(60) | 是 |  | 教师姓名 |
| mobile | varchar(20) | 否 |  | 手机号 |
| employment_type | varchar(20) | 是 | 'full_time' | 用工类型 |
| status | varchar(20) | 是 | 'active' | 状态 |
| hire_date | date | 否 |  | 入职日期 |
| specialties | text | 否 |  | 擅长学科/方向 |
| max_student_capacity | integer | 是 | 30 | 最大学生容量 |
| intro | text | 否 |  | 教师简介 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`teacher_no`；`user_id`
- 常用索引：`status`；`name`


## student_enrollments

> 学生学期在读记录

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| campus_id | uuid | 是 |  | 校区ID；引用 campuses.id |
| primary_teacher_id | uuid | 是 |  | 主负责教师；引用 teachers.id |
| service_mode | varchar(30) | 是 | 'after_school' | 服务模式 |
| status | varchar(20) | 是 | 'active' | 在读状态 |
| enroll_date | date | 是 |  | 入学日期 |
| leave_date | date | 否 |  | 离校日期 |
| leave_reason | varchar(255) | 否 |  | 离校原因 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`student_id, term_id`
- 常用索引：`student_id`；`term_id`；`campus_id`；`primary_teacher_id`；`status`


## family_contact_logs

> 家校沟通记录

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| guardian_id | uuid | 否 |  | 监护人ID；引用 guardians.id |
| contact_at | timestamptz | 是 |  | 沟通时间 |
| channel | varchar(20) | 是 |  | 沟通渠道 |
| topic | varchar(100) | 是 |  | 主题 |
| summary | text | 是 |  | 摘要 |
| action_required | boolean | 是 | false | 是否需要行动 |
| next_contact_at | timestamptz | 否 |  | 下次沟通时间 |
| owner_user_id | uuid | 是 |  | 记录人；引用 users.id |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`student_id, contact_at`；`family_id, contact_at`；`owner_user_id`


## teacher_assignments

> 教师与学生分配表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| teacher_id | uuid | 是 |  | 教师ID；引用 teachers.id |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| assignment_role | varchar(20) | 是 | 'primary' | 分配角色 |
| start_date | date | 是 |  | 开始日期 |
| end_date | date | 否 |  | 结束日期 |
| is_active | boolean | 是 | true | 是否有效 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 唯一约束：`teacher_id, student_id, term_id, assignment_role`
- 常用索引：`teacher_id, term_id`；`student_id, term_id`；`is_active`


## teacher_reviews

> 教师周期性复盘表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| teacher_id | uuid | 是 |  | 教师ID；引用 teachers.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| week_start | date | 是 |  | 周开始 |
| week_end | date | 是 |  | 周结束 |
| assigned_student_count | integer | 是 | 0 | 负责学生数 |
| reviewed_submission_count | integer | 是 | 0 | 作业复核数 |
| parent_contact_count | integer | 是 | 0 | 家长沟通次数 |
| avg_homework_accuracy | numeric(5,2) | 否 |  | 平均作业正确率 |
| avg_habit_score | numeric(5,2) | 否 |  | 平均习惯分 |
| manager_score | numeric(5,2) | 否 |  | 主管评分 |
| self_review | text | 否 |  | 教师自评 |
| manager_comment | text | 否 |  | 主管点评 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 唯一约束：`teacher_id, week_start`
- 常用索引：`teacher_id, week_start`；`term_id`


## teacher_training_records

> 教师培训与任务记录

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| teacher_id | uuid | 是 |  | 教师ID；引用 teachers.id |
| title | varchar(120) | 是 |  | 任务/培训标题 |
| category | varchar(30) | 是 |  | 分类 |
| status | varchar(20) | 是 | 'todo' | 状态 |
| due_date | date | 否 |  | 截止日期 |
| completed_at | timestamptz | 否 |  | 完成时间 |
| reviewer_user_id | uuid | 否 |  | 审核人；引用 users.id |
| score | numeric(5,2) | 否 |  | 评分 |
| summary | text | 否 |  | 总结 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`teacher_id`；`status`；`due_date`


## homework_submissions

> 作业提交表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| campus_id | uuid | 是 |  | 校区ID；引用 campuses.id |
| subject_id | uuid | 是 |  | 科目ID；引用 subjects.id |
| submitted_on | date | 是 |  | 作业日期 |
| source_type | varchar(20) | 是 | 'manual' | 来源 |
| status | varchar(20) | 是 | 'ai_done' | 状态 |
| uploaded_by_user_id | uuid | 否 |  | 上传人；引用 users.id |
| remark | text | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`student_id, submitted_on`；`term_id`；`status`；`subject_id`


## homework_assets

> 作业附件表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| submission_id | uuid | 是 |  | 作业提交ID；引用 homework_submissions.id |
| file_url | text | 是 |  | 文件地址 |
| file_name | varchar(255) | 是 |  | 文件名 |
| file_type | varchar(30) | 是 |  | 文件类型 |
| sort_order | integer | 是 | 0 | 排序 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`submission_id`


## homework_ai_analyses

> 作业AI分析结果

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| submission_id | uuid | 是 |  | 作业提交ID；引用 homework_submissions.id |
| provider | varchar(40) | 是 |  | 模型服务商 |
| model_name | varchar(80) | 是 |  | 模型名称 |
| prompt_version | varchar(40) | 是 |  | 提示词版本 |
| raw_result_md | text | 是 |  | 原始Markdown结果 |
| overall_accuracy | numeric(5,2) | 否 |  | 整体正确率 |
| text_accuracy | numeric(5,2) | 否 |  | 文本正确率 |
| normalized_error_summary | varchar(255) | 否 |  | 标准化错因摘要 |
| suggestion_text | text | 否 |  | 针对性建议 |
| confidence | numeric(5,2) | 否 |  | 置信度 |
| status | varchar(20) | 是 | 'done' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`submission_id, created_at`；`status`


## homework_reviews

> 教师复核结果

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| submission_id | uuid | 是 |  | 作业提交ID；引用 homework_submissions.id |
| reviewer_teacher_id | uuid | 是 |  | 复核教师；引用 teachers.id |
| final_accuracy | numeric(5,2) | 否 |  | 最终正确率 |
| final_text_accuracy | numeric(5,2) | 否 |  | 最终文本正确率 |
| final_error_summary | varchar(255) | 否 |  | 最终错因摘要 |
| risk_level | varchar(20) | 是 | 'normal' | 预警等级 |
| teacher_comment | text | 否 |  | 教师评语 |
| next_action | varchar(120) | 否 |  | 下一步动作 |
| reviewed_at | timestamptz | 否 |  | 复核时间 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`submission_id`
- 常用索引：`reviewer_teacher_id`；`risk_level`；`reviewed_at`


## homework_review_tags

> 复核错因关联表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| review_id | uuid | 是 |  | 复核ID；引用 homework_reviews.id |
| error_tag_id | uuid | 是 |  | 错因ID；引用 error_tags.id |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`review_id, error_tag_id`
- 常用索引：`error_tag_id`


## habit_rubrics

> 习惯评分规则表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| name | varchar(100) | 是 |  | 规则名称 |
| version | varchar(30) | 是 |  | 版本号 |
| description | text | 否 |  | 说明 |
| is_default | boolean | 是 | false | 是否默认 |
| is_active | boolean | 是 | true | 是否启用 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`name, version`


## habit_rubric_dimensions

> 规则与维度关联表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| rubric_id | uuid | 是 |  | 规则ID；引用 habit_rubrics.id |
| dimension_id | uuid | 是 |  | 维度ID；引用 habit_dimensions.id |
| weight | numeric(6,2) | 是 | 1 | 权重 |
| sort_order | integer | 是 | 0 | 排序 |
| score_guide | jsonb | 否 |  | 评分说明 |

- 主键：`rubric_id, dimension_id`
- 常用索引：`dimension_id`


## habit_observations

> 习惯观察主表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| teacher_id | uuid | 是 |  | 观察教师ID；引用 teachers.id |
| rubric_id | uuid | 是 |  | 评分规则ID；引用 habit_rubrics.id |
| observed_on | date | 是 |  | 观察日期 |
| total_score | numeric(6,2) | 否 |  | 总分 |
| summary | text | 否 |  | 整体评语 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`student_id, observed_on`；`teacher_id`；`term_id`


## habit_observation_scores

> 习惯观察维度分表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| observation_id | uuid | 是 |  | 观察ID；引用 habit_observations.id |
| dimension_id | uuid | 是 |  | 维度ID；引用 habit_dimensions.id |
| score | integer | 是 |  | 维度分值 |
| note | varchar(255) | 否 |  | 维度说明 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 唯一约束：`observation_id, dimension_id`
- 常用索引：`observation_id`；`dimension_id`
- 校验：`score >= 1 AND score <= 5`


## growth_goals

> 学生成长目标表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| owner_teacher_id | uuid | 是 |  | 负责教师；引用 teachers.id |
| source | varchar(20) | 是 | 'manual' | 来源 |
| goal_type | varchar(20) | 是 |  | 目标类型 |
| title | varchar(120) | 是 |  | 目标标题 |
| description | text | 否 |  | 目标描述 |
| success_criteria | text | 否 |  | 成功标准 |
| start_date | date | 是 |  | 开始日期 |
| target_date | date | 否 |  | 目标日期 |
| status | varchar(20) | 是 | 'active' | 状态 |
| priority | varchar(20) | 是 | 'medium' | 优先级 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`student_id, status`；`owner_teacher_id`；`target_date`


## growth_goal_checkins

> 成长目标跟进记录

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| goal_id | uuid | 是 |  | 成长目标ID；引用 growth_goals.id |
| checkin_date | date | 是 |  | 跟进日期 |
| progress_percent | numeric(5,2) | 否 |  | 完成度 |
| progress_status | varchar(20) | 是 |  | 进展状态 |
| note | text | 否 |  | 跟进说明 |
| next_step | text | 否 |  | 下一步 |
| by_user_id | uuid | 是 |  | 记录人；引用 users.id |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`goal_id, checkin_date`


## weekly_reports

> 学生周报表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| week_start | date | 是 |  | 周开始 |
| week_end | date | 是 |  | 周结束 |
| generated_source | varchar(20) | 是 | 'manual' | 生成方式 |
| status | varchar(20) | 是 | 'draft' | 状态 |
| homework_summary | text | 否 |  | 作业表现摘要 |
| habit_summary | text | 否 |  | 习惯成长摘要 |
| learning_time_summary | text | 否 |  | 学习时长摘要 |
| family_suggestion | text | 否 |  | 家庭配合建议 |
| teacher_comment | text | 否 |  | 教师评语 |
| created_by_user_id | uuid | 是 |  | 创建人；引用 users.id |
| shared_at | timestamptz | 否 |  | 分享时间 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`student_id, week_start`
- 常用索引：`student_id, week_start`；`status`


## devices

> 设备表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| sn | varchar(80) | 是 |  | 设备序列号 |
| name | varchar(80) | 否 |  | 设备名称 |
| platform | varchar(30) | 否 |  | 平台 |
| status | varchar(20) | 是 | 'active' | 状态 |
| last_seen_at | timestamptz | 否 |  | 最近在线时间 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`sn`


## device_bindings

> 学生设备绑定表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| device_id | uuid | 是 |  | 设备ID；引用 devices.id |
| bind_from | date | 是 |  | 绑定开始 |
| bind_to | date | 否 |  | 绑定结束 |
| status | varchar(20) | 是 | 'active' | 状态 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 唯一约束：`student_id, device_id, bind_from`
- 常用索引：`student_id`；`device_id`；`status`


## checkin_logs

> 签到离校记录表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| campus_id | uuid | 是 |  | 校区ID；引用 campuses.id |
| device_id | uuid | 否 |  | 设备ID；引用 devices.id |
| checkin_at | timestamptz | 否 |  | 签到时间 |
| checkout_at | timestamptz | 否 |  | 离校时间 |
| attendance_status | varchar(20) | 是 | 'checked_in' | 考勤状态 |
| source_type | varchar(20) | 是 | 'device' | 来源 |
| note | varchar(255) | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`student_id, checkin_at`；`campus_id, checkin_at`；`attendance_status`


## study_sessions

> 学习时长记录表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| term_id | uuid | 否 |  | 学期ID；引用 terms.id |
| subject_id | uuid | 否 |  | 科目ID；引用 subjects.id |
| session_date | date | 是 |  | 学习日期 |
| start_at | timestamptz | 否 |  | 开始时间 |
| end_at | timestamptz | 否 |  | 结束时间 |
| duration_minutes | integer | 是 |  | 时长（分钟） |
| device_id | uuid | 否 |  | 设备ID；引用 devices.id |
| source_type | varchar(20) | 是 | 'device' | 来源 |
| homework_submission_id | uuid | 否 |  | 关联作业提交；引用 homework_submissions.id |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`student_id, session_date`；`subject_id`；`device_id`


## fee_plans

> 收费方案表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| campus_id | uuid | 是 |  | 校区ID；引用 campuses.id |
| name | varchar(100) | 是 |  | 方案名称 |
| billing_cycle | varchar(20) | 是 |  | 计费周期 |
| status | varchar(20) | 是 | 'active' | 状态 |
| description | text | 否 |  | 说明 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`campus_id`；`status`


## fee_plan_items

> 收费方案明细表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| fee_plan_id | uuid | 是 |  | 方案ID；引用 fee_plans.id |
| fee_item_id | uuid | 是 |  | 收费项目ID；引用 fee_items.id |
| item_name_snapshot | varchar(100) | 是 |  | 项目快照名 |
| unit_price | numeric(12,2) | 是 | 0 | 单价 |
| default_quantity | numeric(10,2) | 是 | 1 | 默认数量 |
| sort_order | integer | 是 | 0 | 排序 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`fee_plan_id`；`fee_item_id`


## student_contracts

> 学生签约/收费合同表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| term_id | uuid | 是 |  | 学期ID；引用 terms.id |
| fee_plan_id | uuid | 是 |  | 收费方案ID；引用 fee_plans.id |
| contract_no | varchar(60) | 是 |  | 合同编号 |
| start_date | date | 是 |  | 合同开始 |
| end_date | date | 否 |  | 合同结束 |
| status | varchar(20) | 是 | 'active' | 状态 |
| tuition_amount | numeric(12,2) | 是 | 0 | 应收学费 |
| discount_amount | numeric(12,2) | 是 | 0 | 优惠金额 |
| deposit_amount | numeric(12,2) | 是 | 0 | 押金 |
| receivable_amount | numeric(12,2) | 是 | 0 | 净应收 |
| remark | text | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`contract_no`
- 常用索引：`student_id`；`family_id`；`term_id`；`status`


## invoices

> 账单表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| contract_id | uuid | 是 |  | 合同ID；引用 student_contracts.id |
| invoice_no | varchar(60) | 是 |  | 账单编号 |
| issue_date | date | 是 |  | 开单日期 |
| due_date | date | 是 |  | 应付日期 |
| billing_start_date | date | 否 |  | 账期开始 |
| billing_end_date | date | 否 |  | 账期结束 |
| status | varchar(20) | 是 | 'issued' | 状态 |
| total_amount | numeric(12,2) | 是 | 0 | 总金额 |
| discount_amount | numeric(12,2) | 是 | 0 | 优惠金额 |
| receivable_amount | numeric(12,2) | 是 | 0 | 应收金额 |
| received_amount | numeric(12,2) | 是 | 0 | 已收金额 |
| remark | text | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 唯一约束：`invoice_no`
- 常用索引：`student_id`；`family_id`；`status`；`due_date`


## invoice_items

> 账单明细表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| invoice_id | uuid | 是 |  | 账单ID；引用 invoices.id |
| fee_item_id | uuid | 否 |  | 收费项目ID；引用 fee_items.id |
| item_name | varchar(100) | 是 |  | 项目名 |
| quantity | numeric(10,2) | 是 | 1 | 数量 |
| unit_price | numeric(12,2) | 是 | 0 | 单价 |
| line_amount | numeric(12,2) | 是 | 0 | 金额 |
| remark | varchar(255) | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`invoice_id`；`fee_item_id`


## payments

> 收款记录表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| invoice_id | uuid | 是 |  | 账单ID；引用 invoices.id |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| paid_at | timestamptz | 是 |  | 付款时间 |
| amount | numeric(12,2) | 是 |  | 付款金额 |
| method | varchar(20) | 是 |  | 支付方式 |
| transaction_no | varchar(100) | 否 |  | 流水号 |
| operator_user_id | uuid | 否 |  | 收款操作人；引用 users.id |
| remark | varchar(255) | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`invoice_id`；`student_id`；`paid_at`


## refunds

> 退费记录表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| invoice_id | uuid | 是 |  | 账单ID；引用 invoices.id |
| student_id | uuid | 是 |  | 学生ID；引用 students.id |
| family_id | uuid | 是 |  | 家庭ID；引用 families.id |
| refunded_at | timestamptz | 是 |  | 退费时间 |
| amount | numeric(12,2) | 是 |  | 退费金额 |
| method | varchar(20) | 是 |  | 退款方式 |
| reason | varchar(255) | 否 |  | 退费原因 |
| operator_user_id | uuid | 否 |  | 操作人；引用 users.id |
| remark | varchar(255) | 否 |  | 备注 |
| created_at | timestamptz | 是 | now() | 创建时间 |

- 主键：`id`
- 常用索引：`invoice_id`；`student_id`；`refunded_at`


## tasks

> 通用任务表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| task_type | varchar(30) | 是 |  | 任务类型 |
| source_type | varchar(40) | 否 |  | 来源模块 |
| source_id | uuid | 否 |  | 来源ID |
| student_id | uuid | 否 |  | 学生ID；引用 students.id |
| family_id | uuid | 否 |  | 家庭ID；引用 families.id |
| teacher_id | uuid | 否 |  | 教师ID；引用 teachers.id |
| owner_user_id | uuid | 是 |  | 负责人；引用 users.id |
| title | varchar(120) | 是 |  | 标题 |
| description | text | 否 |  | 说明 |
| priority | varchar(20) | 是 | 'medium' | 优先级 |
| due_at | timestamptz | 否 |  | 截止时间 |
| status | varchar(20) | 是 | 'todo' | 状态 |
| result_note | text | 否 |  | 完成说明 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`owner_user_id, status`；`student_id`；`due_at`；`priority`


## alerts

> 预警表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 是 | gen_random_uuid() | 主键 |
| alert_type | varchar(30) | 是 |  | 预警类型 |
| alert_level | varchar(20) | 是 |  | 预警等级 |
| source_type | varchar(40) | 否 |  | 来源模块 |
| source_id | uuid | 否 |  | 来源ID |
| student_id | uuid | 否 |  | 学生ID；引用 students.id |
| family_id | uuid | 否 |  | 家庭ID；引用 families.id |
| invoice_id | uuid | 否 |  | 账单ID；引用 invoices.id |
| title | varchar(120) | 是 |  | 标题 |
| content | text | 是 |  | 内容 |
| status | varchar(20) | 是 | 'open' | 状态 |
| resolver_user_id | uuid | 否 |  | 处理人；引用 users.id |
| resolved_at | timestamptz | 否 |  | 处理时间 |
| created_at | timestamptz | 是 | now() | 创建时间 |
| updated_at | timestamptz | 是 | now() | 更新时间 |

- 主键：`id`
- 常用索引：`status, alert_level`；`student_id`；`invoice_id`；`created_at`
