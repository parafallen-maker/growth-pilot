-- 基础字典与默认规则种子数据
begin;

-- 角色
insert into roles (code, name, description) values ('super_admin', '超级管理员', '全局管理') on conflict (code) do update set name=excluded.name, description=excluded.description;
insert into roles (code, name, description) values ('principal', '校长', '经营与教学总览') on conflict (code) do update set name=excluded.name, description=excluded.description;
insert into roles (code, name, description) values ('ops_manager', '教务运营', '学生/家庭/周报/任务') on conflict (code) do update set name=excluded.name, description=excluded.description;
insert into roles (code, name, description) values ('teacher', '教师', '作业复核与成长跟进') on conflict (code) do update set name=excluded.name, description=excluded.description;
insert into roles (code, name, description) values ('finance', '财务', '收费与收退费') on conflict (code) do update set name=excluded.name, description=excluded.description;

-- 年级
insert into grade_levels (code, name, sort_order, is_active) values ('g1', '一年级', 1, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into grade_levels (code, name, sort_order, is_active) values ('g2', '二年级', 2, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into grade_levels (code, name, sort_order, is_active) values ('g3', '三年级', 3, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into grade_levels (code, name, sort_order, is_active) values ('g4', '四年级', 4, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into grade_levels (code, name, sort_order, is_active) values ('g5', '五年级', 5, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into grade_levels (code, name, sort_order, is_active) values ('g6', '六年级', 6, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;

-- 科目
insert into subjects (code, name, sort_order, is_active) values ('chinese', '语文', 1, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into subjects (code, name, sort_order, is_active) values ('math', '数学', 2, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into subjects (code, name, sort_order, is_active) values ('english', '英语', 3, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into subjects (code, name, sort_order, is_active) values ('science', '科学', 4, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;
insert into subjects (code, name, sort_order, is_active) values ('other', '其他', 99, true) on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, is_active=true;

-- 标准错因
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('concept_confusion', '概念混淆', 'knowledge', 'watch', '知识概念理解错误', 1, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('knowledge_confusion', '知识混淆', 'knowledge', 'watch', '知识点易混', 2, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('misread_question', '审题偏差', 'process', 'watch', '题意理解偏差', 3, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('calculation_error', '计算失误', 'process', 'watch', '计算粗心或运算失误', 4, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('missing_steps', '步骤缺失', 'process', 'watch', '过程不完整', 5, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('incomplete_answer', '遗漏作答', 'process', 'coaching', '有题未作或答案不完整', 6, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('method_not_mastered', '方法未掌握', 'skill', 'coaching', '方法不会用', 7, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('expression_unclear', '表述不清', 'expression', 'watch', '表达不清楚', 8, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('handwriting_issue', '书写潦草', 'expression', 'watch', '书写影响理解', 9, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('careless_error', '非知识性错误', 'habit', 'watch', '粗心、格式等非知识问题', 10, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('not_mastered', '完全未掌握', 'skill', 'critical', '知识或方法完全不会', 11, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into error_tags (code, name, category, default_risk_level, description, sort_order, is_active) values ('no_error', '无知识性错误', 'positive', 'normal', '表现正常或优秀', 12, true) on conflict (code) do update set name=excluded.name, category=excluded.category, default_risk_level=excluded.default_risk_level, description=excluded.description, sort_order=excluded.sort_order, is_active=true;

-- 习惯维度
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('punctuality', '准时性', '是否能按要求及时开始与完成', 1, 5, 1, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('neatness', '整洁度', '书写与物品是否整洁', 1, 5, 2, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('focus', '专注力', '是否专注完成任务', 1, 5, 3, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('independent_thinking', '自主思考能力', '是否先思考再求助', 1, 5, 4, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('polite_communication', '礼貌沟通', '沟通时是否礼貌清晰', 1, 5, 5, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;
insert into habit_dimensions (code, name, description, score_min, score_max, sort_order, is_active) values ('organization', '物品整理', '学习用品是否能自主整理', 1, 5, 6, true) on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;

-- 收费项目
insert into fee_items (code, name, category, unit, default_price, is_active) values ('tuition', '托管学费', 'tuition', '月', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;
insert into fee_items (code, name, category, unit, default_price, is_active) values ('meal', '餐费', 'meal', '月', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;
insert into fee_items (code, name, category, unit, default_price, is_active) values ('material', '资料费', 'material', '次', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;
insert into fee_items (code, name, category, unit, default_price, is_active) values ('device', '设备费', 'device', '次', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;
insert into fee_items (code, name, category, unit, default_price, is_active) values ('extended_care', '延时服务费', 'service', '次', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;
insert into fee_items (code, name, category, unit, default_price, is_active) values ('other', '其他', 'other', '次', 0, true) on conflict (code) do update set name=excluded.name, category=excluded.category, unit=excluded.unit, default_price=excluded.default_price, is_active=true;

-- 默认习惯评分规则
insert into habit_rubrics (name, version, description, is_default, is_active)
values ('默认学习习惯评分规则', 'v1', '基于现有 Excel 的 6 维观察法', true, true)
on conflict (name, version) do update set description=excluded.description, is_default=true, is_active=true;

insert into habit_rubric_dimensions (rubric_id, dimension_id, weight, sort_order, score_guide)
select r.id, d.id, 1, d.sort_order, null
from habit_rubrics r
join habit_dimensions d on d.code in ('punctuality','neatness','focus','independent_thinking','polite_communication','organization')
where r.name='默认学习习惯评分规则' and r.version='v1'
on conflict (rubric_id, dimension_id) do update set weight=excluded.weight, sort_order=excluded.sort_order;

commit;