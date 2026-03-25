import { createId, date, integer, jsonb, jsonbDefault, numeric, pgTable, sql, text, timestamp, uniqueIndex, varchar } from './base';
import { students } from './students';
import { schoolTerms } from './settings';
import { teachers } from './teachers';
import { jobs } from './jobs';

export const rubricTemplates = pgTable('rubric_templates', {
  id: createId(),
  campusId: varchar('campus_id', { length: 36 }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 128 }).notNull(),
  stageScope: varchar('stage_scope', { length: 64 }),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  description: text('description'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rubricDimensions = pgTable('rubric_dimensions', {
  id: createId(),
  templateId: varchar('template_id', { length: 36 }).notNull().references(() => rubricTemplates.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  weight: numeric('weight', { precision: 8, scale: 2 }).default('1').notNull(),
  scoreMin: integer('score_min').default(1).notNull(),
  scoreMax: integer('score_max').default(5).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('rubric_dimensions_template_code_uq').on(table.templateId, table.code)]);

export const growthObservations = pgTable('growth_observations', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  teacherId: varchar('teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  templateId: varchar('template_id', { length: 36 }).references(() => rubricTemplates.id, { onDelete: 'set null' }),
  observationDate: date('observation_date').notNull(),
  scene: varchar('scene', { length: 32 }).notNull(),
  scores: jsonb('scores')
    .$type<Array<{ dimensionId: string; score: number; note?: string }>>()
    .default(sql`'[]'::jsonb`)
    .notNull(),
  totalScore: numeric('total_score', { precision: 8, scale: 2 }),
  strengths: text('strengths'),
  improvementNotes: text('improvement_notes'),
  publishToFamily: varchar('publish_to_family', { length: 5 }).default('false').notNull(),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const growthGoals = pgTable('growth_goals', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  goalType: varchar('goal_type', { length: 32 }).notNull(),
  title: varchar('title', { length: 128 }).notNull(),
  description: text('description'),
  ownerRole: varchar('owner_role', { length: 16 }).default('teacher').notNull(),
  metricType: varchar('metric_type', { length: 16 }).default('score').notNull(),
  baselineValue: numeric('baseline_value', { precision: 10, scale: 2 }),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  status: varchar('status', { length: 16 }).default('draft').notNull(),
  sourceType: varchar('source_type', { length: 32 }),
  sourceId: varchar('source_id', { length: 36 }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const growthGoalCheckins = pgTable('growth_goal_checkins', {
  id: createId(),
  goalId: varchar('goal_id', { length: 36 }).notNull().references(() => growthGoals.id, { onDelete: 'cascade' }),
  checkinDate: date('checkin_date').notNull(),
  progressValue: numeric('progress_value', { precision: 10, scale: 2 }),
  progressNote: text('progress_note'),
  nextAction: text('next_action'),
  recorderUserId: varchar('recorder_user_id', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const growthReports = pgTable('growth_reports', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  reportType: varchar('report_type', { length: 16 }).notNull(),
  periodKey: varchar('period_key', { length: 32 }).notNull(),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  status: varchar('status', { length: 16 }).default('draft').notNull(),
  title: varchar('title', { length: 128 }),
  draftMarkdown: text('draft_markdown'),
  summaryJson: jsonbDefault('summary_json'),
  generatedByJobId: varchar('generated_by_job_id', { length: 36 }).references(() => jobs.id, { onDelete: 'set null' }),
  reviewerUserId: varchar('reviewer_user_id', { length: 36 }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('growth_reports_student_type_period_uq').on(table.studentId, table.reportType, table.periodKey)]);
