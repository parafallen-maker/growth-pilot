-- 洪基托管成长中心｜PostgreSQL 16 DDL
-- 说明：
-- 1. 本文件用于直接初始化数据库。
-- 2. 采用模块化单体 + PostgreSQL。
-- 3. 不包含法律合规与心理筛查模块。
-- 4. 所有金额字段统一使用 cents（分）。
-- 5. 所有时间统一使用 timestamptz，日期使用 date。

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 00. 基础函数
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 01. 平台基础
-- =========================================================

CREATE TABLE campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  address TEXT,
  contact_phone VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE school_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  scope_level VARCHAR(16) NOT NULL DEFAULT 'campus' CHECK (scope_level IN ('global', 'campus', 'teacher')),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  mobile VARCHAR(32),
  email VARCHAR(128),
  avatar_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider VARCHAR(32) NOT NULL DEFAULT 's3',
  bucket_name VARCHAR(128) NOT NULL,
  object_key VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum VARCHAR(128),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_name, object_key)
);

CREATE TABLE system_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dict_type VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  value VARCHAR(255),
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dict_type, code)
);

CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(64) NOT NULL,
  biz_type VARCHAR(64) NOT NULL,
  biz_id UUID NOT NULL,
  idempotency_key VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'canceled')),
  priority INT NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  biz_type VARCHAR(64) NOT NULL,
  biz_id UUID,
  trace_id VARCHAR(128),
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kpi_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  metric_code VARCHAR(64) NOT NULL,
  metric_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  metric_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campus_id, stat_date, metric_code)
);

-- =========================================================
-- 02. 教师域
-- =========================================================

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_no VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  mobile VARCHAR(32),
  email VARCHAR(128),
  hire_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('onboarding', 'active', 'paused', 'left')),
  lead_subject VARCHAR(32),
  avatar_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  bio TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject VARCHAR(32) NOT NULL,
  grade_range VARCHAR(64),
  level VARCHAR(32),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject, grade_range)
);

CREATE TABLE teacher_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type VARCHAR(32) NOT NULL DEFAULT 'duty' CHECK (shift_type IN ('duty', 'class_support', 'front_desk', 'homework_supervision')),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE teacher_development_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  record_type VARCHAR(32) NOT NULL CHECK (record_type IN ('training', 'coaching', 'improvement_plan', 'review')),
  title VARCHAR(128) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observer_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  strengths TEXT,
  improvements TEXT,
  action_items TEXT,
  due_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'closed')),
  attachment_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teaching_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  grade_range VARCHAR(64),
  lead_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campus_id, term_id, code)
);

-- =========================================================
-- 03. 学生与家庭域
-- =========================================================

CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code VARCHAR(32) NOT NULL UNIQUE,
  family_name VARCHAR(128),
  primary_contact_name VARCHAR(64),
  primary_mobile VARCHAR(32),
  secondary_mobile VARCHAR(32),
  family_structure VARCHAR(32),
  address TEXT,
  communication_preference VARCHAR(32) DEFAULT 'wechat' CHECK (communication_preference IN ('wechat', 'phone', 'in_person', 'mixed')),
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  relation VARCHAR(32) NOT NULL,
  mobile VARCHAR(32),
  wechat_id VARCHAR(64),
  email VARCHAR(128),
  occupation VARCHAR(64),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_no VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  gender VARCHAR(16) CHECK (gender IN ('male', 'female', 'unknown')),
  birth_date DATE,
  school_name VARCHAR(128),
  grade_label VARCHAR(32) NOT NULL,
  class_name VARCHAR(64),
  home_campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  photo_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('lead', 'trial', 'active', 'paused', 'left', 'alumni')),
  profile_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES school_terms(id) ON DELETE CASCADE,
  primary_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  group_id UUID REFERENCES teaching_groups(id) ON DELETE SET NULL,
  enroll_date DATE NOT NULL,
  leave_date DATE,
  leave_reason TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'paused', 'left', 'completed')),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, campus_id, term_id),
  CHECK (leave_date IS NULL OR leave_date >= enroll_date)
);

CREATE TABLE student_external_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(32) NOT NULL,
  institution_name VARCHAR(128),
  schedule_note TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tag_code VARCHAR(64) NOT NULL,
  tag_name VARCHAR(64) NOT NULL,
  tag_color VARCHAR(16),
  source_type VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'system', 'migration')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, tag_code)
);

CREATE TABLE pickup_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  relation VARCHAR(32),
  mobile VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 04. 出勤与时长域
-- =========================================================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  serial_no VARCHAR(64) NOT NULL UNIQUE,
  device_type VARCHAR(32) NOT NULL DEFAULT 'beacon' CHECK (device_type IN ('beacon', 'tablet', 'gate', 'manual')),
  status VARCHAR(16) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'bound', 'repair', 'retired')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unbound_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (unbound_at IS NULL OR unbound_at >= bound_at)
);

CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('checkin', 'checkout', 'manual_checkin', 'manual_checkout')),
  event_time TIMESTAMPTZ NOT NULL,
  operator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_time_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  subject VARCHAR(32) NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  source_type VARCHAR(16) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'device')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (duration_minutes >= 0)
);

CREATE TABLE homework_time_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  subject VARCHAR(32) NOT NULL,
  total_minutes INT NOT NULL DEFAULT 0,
  session_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, stat_date, subject)
);

-- =========================================================
-- 05. 作业诊断域
-- =========================================================

CREATE TABLE error_taxonomies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  subject_scope VARCHAR(32),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_no VARCHAR(32) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  subject VARCHAR(32) NOT NULL,
  homework_date DATE NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'teacher_upload' CHECK (source_type IN ('teacher_upload', 'parent_upload', 'device_upload', 'migration')),
  source_channel VARCHAR(32) NOT NULL DEFAULT 'web',
  ai_status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending', 'running', 'ready', 'failed', 'skipped')),
  review_status VARCHAR(16) NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'reviewing', 'reviewed', 'published')),
  final_accuracy_pct NUMERIC(5, 2),
  final_error_summary TEXT,
  family_feedback_status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (family_feedback_status IN ('draft', 'ready', 'published', 'hidden')),
  remark TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, file_id)
);

CREATE TABLE homework_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
  provider VARCHAR(64) NOT NULL,
  model_name VARCHAR(64) NOT NULL,
  model_version VARCHAR(64),
  prompt_version VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'canceled')),
  raw_markdown TEXT,
  structured_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  accuracy_pct NUMERIC(5, 2),
  error_summary_text TEXT,
  suggestion_text TEXT,
  confidence NUMERIC(5, 2),
  duration_ms INT,
  input_tokens INT,
  output_tokens INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES homework_submissions(id) ON DELETE CASCADE,
  reviewer_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  review_result VARCHAR(16) NOT NULL CHECK (review_result IN ('approved', 'adjusted', 'rejected')),
  final_accuracy_pct NUMERIC(5, 2),
  final_error_summary TEXT,
  final_suggestion TEXT,
  publish_to_family BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_review_error_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES homework_reviews(id) ON DELETE CASCADE,
  error_taxonomy_id UUID NOT NULL REFERENCES error_taxonomies(id) ON DELETE RESTRICT,
  weight NUMERIC(8, 2) NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, error_taxonomy_id)
);

-- =========================================================
-- 06. 成长域
-- =========================================================

CREATE TABLE rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  name VARCHAR(128) NOT NULL,
  stage_scope VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'inactive')),
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rubric_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  weight NUMERIC(8, 2) NOT NULL DEFAULT 1,
  score_min INT NOT NULL DEFAULT 1,
  score_max INT NOT NULL DEFAULT 5,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, code),
  CHECK (score_max >= score_min)
);

CREATE TABLE growth_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  template_id UUID REFERENCES rubric_templates(id) ON DELETE SET NULL,
  observation_date DATE NOT NULL,
  scene VARCHAR(32) NOT NULL CHECK (scene IN ('classroom', 'after_class_homework', 'arrival', 'departure', 'family_feedback', 'other')),
  total_score NUMERIC(8, 2),
  strengths TEXT,
  improvement_notes TEXT,
  publish_to_family BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE growth_observation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES growth_observations(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES rubric_dimensions(id) ON DELETE RESTRICT,
  score NUMERIC(8, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (observation_id, dimension_id)
);

CREATE TABLE growth_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  goal_type VARCHAR(32) NOT NULL CHECK (goal_type IN ('habit', 'academic', 'family')),
  title VARCHAR(128) NOT NULL,
  description TEXT,
  owner_role VARCHAR(16) NOT NULL DEFAULT 'teacher' CHECK (owner_role IN ('student', 'family', 'teacher')),
  metric_type VARCHAR(16) NOT NULL DEFAULT 'score' CHECK (metric_type IN ('score', 'count', 'percent', 'minutes', 'boolean')),
  baseline_value NUMERIC(10, 2),
  target_value NUMERIC(10, 2),
  current_value NUMERIC(10, 2),
  start_date DATE,
  due_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'done', 'paused', 'closed')),
  source_type VARCHAR(32),
  source_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

CREATE TABLE growth_goal_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES growth_goals(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  progress_value NUMERIC(10, 2),
  progress_note TEXT,
  next_action TEXT,
  recorder_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE praise_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  praise_date DATE NOT NULL,
  category VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  publish_to_family BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE growth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  report_type VARCHAR(16) NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  period_key VARCHAR(32) NOT NULL,
  period_start DATE,
  period_end DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  title VARCHAR(128),
  draft_markdown TEXT,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
  reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, report_type, period_key)
);

CREATE TABLE family_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  source_type VARCHAR(32) CHECK (source_type IN ('growth_goal', 'growth_report', 'homework_review', 'meeting', 'manual')),
  source_id UUID,
  title VARCHAR(128) NOT NULL,
  description TEXT,
  frequency VARCHAR(16) NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly')),
  assignee_guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'canceled')),
  completion_note TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 07. 收费域
-- =========================================================

CREATE TABLE billing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('care', 'homework', 'subject_tutoring', 'other')),
  billing_mode VARCHAR(16) NOT NULL CHECK (billing_mode IN ('monthly', 'term', 'package')),
  price_cents BIGINT NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'term',
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (price_cents >= 0)
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no VARCHAR(32) NOT NULL UNIQUE,
  campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  term_id UUID REFERENCES school_terms(id) ON DELETE SET NULL,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  sign_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  discount_amount_cents BIGINT NOT NULL DEFAULT 0,
  payable_amount_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'terminated')),
  remark TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (total_amount_cents >= 0),
  CHECK (discount_amount_cents >= 0),
  CHECK (payable_amount_cents >= 0)
);

CREATE TABLE contract_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  item_name VARCHAR(128) NOT NULL,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (unit_price_cents >= 0),
  CHECK (quantity >= 0),
  CHECK (subtotal_cents >= 0)
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) NOT NULL UNIQUE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  billing_period VARCHAR(32),
  issue_date DATE NOT NULL,
  due_date DATE,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'overdue', 'canceled')),
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount_cents >= 0)
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_name VARCHAR(128) NOT NULL,
  product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity >= 0),
  CHECK (unit_price_cents >= 0),
  CHECK (amount_cents >= 0)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_no VARCHAR(32) NOT NULL UNIQUE,
  paid_amount_cents BIGINT NOT NULL,
  payment_time TIMESTAMPTZ NOT NULL,
  channel VARCHAR(32) NOT NULL CHECK (channel IN ('cash', 'wechat', 'alipay', 'bank_transfer', 'other')),
  transaction_no VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'void')),
  idempotency_key VARCHAR(128),
  operator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (paid_amount_cents >= 0)
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  refund_no VARCHAR(32) NOT NULL UNIQUE,
  refund_amount_cents BIGINT NOT NULL,
  refund_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'void')),
  operator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (refund_amount_cents >= 0)
);

CREATE TABLE billing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(32) NOT NULL CHECK (adjustment_type IN ('discount', 'waiver', 'freeze', 'manual')),
  amount_cents BIGINT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE renewal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  expected_end_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'contacting', 'won', 'lost', 'closed')),
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 08. 沟通域
-- =========================================================

CREATE TABLE communication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('wechat', 'phone', 'in_person', 'system', 'other')),
  direction VARCHAR(16) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  topic VARCHAR(128),
  summary TEXT NOT NULL,
  next_action TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  host_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  meeting_time TIMESTAMPTZ NOT NULL,
  meeting_type VARCHAR(32) NOT NULL CHECK (meeting_type IN ('enrollment', 'routine_review', 'problem_solving', 'renewal')),
  status VARCHAR(16) NOT NULL DEFAULT 'done' CHECK (status IN ('planned', 'done', 'canceled')),
  summary TEXT,
  next_meeting_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_meeting_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES family_meetings(id) ON DELETE CASCADE,
  title VARCHAR(128) NOT NULL,
  assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  due_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'canceled')),
  result_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('wechat', 'sms', 'email', 'internal')),
  subject_template VARCHAR(255),
  body_template TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  source_type VARCHAR(32) CHECK (source_type IN ('growth_report', 'invoice', 'family_task', 'manual')),
  source_id UUID,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('wechat', 'sms', 'email', 'internal')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES outbound_messages(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  receiver_mobile VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  raw_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 09. 索引
-- =========================================================

CREATE INDEX idx_school_terms_campus ON school_terms(campus_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE UNIQUE INDEX uq_user_roles_global ON user_roles(user_id, role_id) WHERE campus_id IS NULL;
CREATE UNIQUE INDEX uq_user_roles_by_campus ON user_roles(user_id, role_id, campus_id) WHERE campus_id IS NOT NULL;
CREATE INDEX idx_ai_jobs_biz ON ai_jobs(biz_type, biz_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status, job_type);
CREATE UNIQUE INDEX uq_ai_jobs_active_dedupe ON ai_jobs(job_type, biz_type, biz_id) WHERE status IN ('queued', 'running');
CREATE INDEX idx_operation_logs_biz ON operation_logs(biz_type, biz_id);
CREATE INDEX idx_operation_logs_user ON operation_logs(user_id, created_at DESC);
CREATE INDEX idx_teachers_campus_status ON teachers(campus_id, status);
CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_shifts_teacher_term ON teacher_shifts(teacher_id, term_id);
CREATE INDEX idx_teacher_dev_teacher_time ON teacher_development_records(teacher_id, occurred_at DESC);
CREATE INDEX idx_groups_term_campus ON teaching_groups(term_id, campus_id);
CREATE INDEX idx_guardians_family ON guardians(family_id);
CREATE UNIQUE INDEX uq_guardians_primary_per_family ON guardians(family_id) WHERE is_primary = TRUE;
CREATE INDEX idx_students_family ON students(family_id);
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_campus_status ON students(home_campus_id, status);
CREATE INDEX idx_enrollments_student_term ON student_enrollments(student_id, term_id);
CREATE INDEX idx_enrollments_teacher_term ON student_enrollments(primary_teacher_id, term_id);
CREATE INDEX idx_enrollments_status ON student_enrollments(status);
CREATE INDEX idx_external_courses_student ON student_external_courses(student_id);
CREATE INDEX idx_student_tags_student ON student_tags(student_id);
CREATE INDEX idx_pickup_contacts_student ON pickup_contacts(student_id);
CREATE INDEX idx_device_bindings_student ON student_device_bindings(student_id, status);
CREATE INDEX idx_device_bindings_device ON student_device_bindings(device_id, status);
CREATE UNIQUE INDEX uq_device_bindings_active_student ON student_device_bindings(student_id) WHERE status = 'active';
CREATE UNIQUE INDEX uq_device_bindings_active_device ON student_device_bindings(device_id) WHERE status = 'active';
CREATE INDEX idx_attendance_student_time ON attendance_events(student_id, event_time DESC);
CREATE INDEX idx_attendance_campus_time ON attendance_events(campus_id, event_time DESC);
CREATE UNIQUE INDEX uq_attendance_events_device_time_type ON attendance_events(device_id, event_time, event_type) WHERE device_id IS NOT NULL;
CREATE INDEX idx_hw_time_sessions_student_time ON homework_time_sessions(student_id, start_time DESC);
CREATE INDEX idx_hw_time_daily_student_date ON homework_time_daily_stats(student_id, stat_date DESC);
CREATE INDEX idx_error_taxonomies_scope ON error_taxonomies(subject_scope, active);
CREATE INDEX idx_hw_submissions_student_date ON homework_submissions(student_id, homework_date DESC);
CREATE INDEX idx_hw_submissions_teacher_date ON homework_submissions(teacher_id, homework_date DESC);
CREATE INDEX idx_hw_submissions_status ON homework_submissions(ai_status, review_status);
CREATE INDEX idx_hw_submissions_subject_date ON homework_submissions(subject, homework_date DESC);
CREATE INDEX idx_hw_files_submission ON homework_submission_files(submission_id);
CREATE INDEX idx_hw_ai_submission_created ON homework_ai_analyses(submission_id, created_at DESC);
CREATE INDEX idx_hw_reviews_teacher_time ON homework_reviews(reviewer_teacher_id, reviewed_at DESC);
CREATE INDEX idx_hw_review_errors_review ON homework_review_error_items(review_id);
CREATE INDEX idx_rubric_dimensions_template ON rubric_dimensions(template_id, sort_order);
CREATE INDEX idx_growth_obs_student_date ON growth_observations(student_id, observation_date DESC);
CREATE INDEX idx_growth_obs_teacher_date ON growth_observations(teacher_id, observation_date DESC);
CREATE INDEX idx_growth_scores_observation ON growth_observation_scores(observation_id);
CREATE INDEX idx_growth_goals_student_status ON growth_goals(student_id, status);
CREATE INDEX idx_growth_goal_checkins_goal_date ON growth_goal_checkins(goal_id, checkin_date DESC);
CREATE INDEX idx_praise_student_date ON praise_records(student_id, praise_date DESC);
CREATE INDEX idx_growth_reports_student_period ON growth_reports(student_id, report_type, period_key);
CREATE INDEX idx_family_tasks_family_status ON family_tasks(family_id, status);
CREATE INDEX idx_family_tasks_student_status ON family_tasks(student_id, status);
CREATE INDEX idx_products_category_status ON billing_products(category, status);
CREATE INDEX idx_contracts_family_status ON contracts(family_id, status);
CREATE INDEX idx_contracts_student_status ON contracts(student_id, status);
CREATE INDEX idx_contract_items_contract ON contract_items(contract_id);
CREATE INDEX idx_invoices_family_status ON invoices(family_id, status);
CREATE INDEX idx_invoices_student_status ON invoices(student_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_time ON payments(invoice_id, payment_time DESC);
CREATE UNIQUE INDEX uq_payments_idempotency_key ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status, payment_time DESC);
CREATE INDEX idx_refunds_payment_time ON refunds(payment_id, refund_time DESC);
CREATE INDEX idx_adjustments_contract ON billing_adjustments(contract_id);
CREATE INDEX idx_adjustments_invoice ON billing_adjustments(invoice_id);
CREATE INDEX idx_renewals_owner_status ON renewal_tasks(owner_user_id, status);
CREATE INDEX idx_comm_records_family_time ON communication_records(family_id, created_at DESC);
CREATE INDEX idx_comm_records_student_time ON communication_records(student_id, created_at DESC);
CREATE INDEX idx_family_meetings_family_time ON family_meetings(family_id, meeting_time DESC);
CREATE INDEX idx_meeting_followups_meeting ON family_meeting_followups(meeting_id);
CREATE INDEX idx_outbound_messages_family_status ON outbound_messages(family_id, status);
CREATE INDEX idx_outbound_messages_student_status ON outbound_messages(student_id, status);
CREATE INDEX idx_message_deliveries_message ON message_deliveries(message_id);

-- =========================================================
-- 10. 视图
-- =========================================================

CREATE VIEW vw_family_ar_balance AS
SELECT
  f.id AS family_id,
  COALESCE(inv.receivable_cents, 0) - COALESCE(pay.received_cents, 0) AS balance_cents
FROM families f
LEFT JOIN (
  SELECT
    family_id,
    SUM(CASE WHEN status IN ('issued', 'partial', 'overdue') THEN amount_cents ELSE 0 END) AS receivable_cents
  FROM invoices
  GROUP BY family_id
) inv ON inv.family_id = f.id
LEFT JOIN (
  SELECT
    i.family_id,
    SUM(CASE WHEN p.status = 'success' THEN p.paid_amount_cents ELSE 0 END) AS received_cents
  FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
  GROUP BY i.family_id
) pay ON pay.family_id = f.id;

CREATE VIEW vw_teacher_workload AS
SELECT
  t.id AS teacher_id,
  t.name,
  COALESCE(e.active_student_count, 0) AS active_student_count,
  COALESCE(h.pending_homework_count, 0) AS pending_homework_count
FROM teachers t
LEFT JOIN (
  SELECT
    primary_teacher_id AS teacher_id,
    COUNT(DISTINCT student_id) AS active_student_count
  FROM student_enrollments
  WHERE status = 'active'
  GROUP BY primary_teacher_id
) e ON e.teacher_id = t.id
LEFT JOIN (
  SELECT
    teacher_id,
    COUNT(*) AS pending_homework_count
  FROM homework_submissions
  WHERE review_status IN ('unreviewed', 'reviewing')
  GROUP BY teacher_id
) h ON h.teacher_id = t.id;

CREATE VIEW vw_homework_daily_accuracy AS
SELECT
  student_id,
  homework_date,
  subject,
  AVG(final_accuracy_pct) AS avg_accuracy_pct,
  COUNT(*) AS submission_count
FROM homework_submissions
WHERE final_accuracy_pct IS NOT NULL
GROUP BY student_id, homework_date, subject;

CREATE VIEW vw_student_current_summary AS
SELECT
  s.id AS student_id,
  s.student_no,
  s.name,
  s.grade_label,
  s.status AS student_status,
  e.campus_id,
  e.term_id,
  e.primary_teacher_id,
  e.status AS enrollment_status,
  f.id AS family_id,
  f.primary_contact_name,
  f.primary_mobile,
  COALESCE(b.balance_cents, 0) AS balance_cents
FROM students s
LEFT JOIN LATERAL (
  SELECT *
  FROM student_enrollments se
  WHERE se.student_id = s.id
  ORDER BY
    CASE WHEN se.status = 'active' THEN 0 ELSE 1 END,
    se.enroll_date DESC,
    se.created_at DESC
  LIMIT 1
) e ON TRUE
LEFT JOIN families f ON f.id = s.family_id
LEFT JOIN vw_family_ar_balance b ON b.family_id = f.id;

-- =========================================================
-- 11. 更新时间触发器
-- =========================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'campuses',
    'school_terms',
    'roles',
    'users',
    'system_dictionaries',
    'teachers',
    'teacher_shifts',
    'teacher_development_records',
    'teaching_groups',
    'families',
    'guardians',
    'students',
    'student_enrollments',
    'student_external_courses',
    'pickup_contacts',
    'devices',
    'student_device_bindings',
    'error_taxonomies',
    'homework_submissions',
    'homework_reviews',
    'rubric_templates',
    'rubric_dimensions',
    'growth_observations',
    'growth_goals',
    'praise_records',
    'growth_reports',
    'family_tasks',
    'billing_products',
    'contracts',
    'invoices',
    'payments',
    'refunds',
    'renewal_tasks',
    'communication_records',
    'family_meetings',
    'family_meeting_followups',
    'message_templates',
    'outbound_messages'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

COMMIT;
