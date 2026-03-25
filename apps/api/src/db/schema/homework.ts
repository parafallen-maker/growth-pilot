import { createId, date, integer, jsonb, jsonbDefault, numeric, pgTable, sql, text, timestamp, uniqueIndex, varchar } from './base';
import { students } from './students';
import { campuses, schoolTerms } from './settings';
import { teachers } from './teachers';
import { jobs, fileAssets } from './jobs';

export const errorTaxonomies = pgTable('error_taxonomies', {
  id: createId(),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(),
  subjectScope: varchar('subject_scope', { length: 32 }),
  description: text('description'),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  sortOrder: integer('sort_order').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('error_taxonomies_code_uq').on(table.code)]);

export const homeworkSubmissions = pgTable('homework_submissions', {
  id: createId(),
  submissionNo: varchar('submission_no', { length: 32 }).notNull(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  teacherId: varchar('teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 32 }).notNull(),
  homeworkDate: date('homework_date').notNull(),
  sourceType: varchar('source_type', { length: 32 }).default('teacher_upload').notNull(),
  sourceChannel: varchar('source_channel', { length: 32 }).default('web').notNull(),
  aiStatus: varchar('ai_status', { length: 16 }).default('pending').notNull(),
  reviewStatus: varchar('review_status', { length: 16 }).default('unreviewed').notNull(),
  finalAccuracyPct: numeric('final_accuracy_pct', { precision: 5, scale: 2 }),
  finalErrorSummary: text('final_error_summary'),
  familyFeedbackStatus: varchar('family_feedback_status', { length: 16 }).default('draft').notNull(),
  remark: text('remark'),
  uploadedBy: varchar('uploaded_by', { length: 36 }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_submissions_submission_no_uq').on(table.submissionNo)]);

export const homeworkAiAnalyses = pgTable('homework_ai_analyses', {
  id: createId(),
  submissionId: varchar('submission_id', { length: 36 }).notNull().references(() => homeworkSubmissions.id, { onDelete: 'cascade' }),
  jobId: varchar('job_id', { length: 36 }).references(() => jobs.id, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 64 }).notNull(),
  modelName: varchar('model_name', { length: 64 }).notNull(),
  modelVersion: varchar('model_version', { length: 64 }),
  promptVersion: varchar('prompt_version', { length: 64 }),
  status: varchar('status', { length: 16 }).default('success').notNull(),
  rawMarkdown: text('raw_markdown'),
  structuredOutput: jsonbDefault('structured_output'),
  accuracyPct: numeric('accuracy_pct', { precision: 5, scale: 2 }),
  errorSummaryText: text('error_summary_text'),
  suggestionText: text('suggestion_text'),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  durationMs: integer('duration_ms'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homeworkReviews = pgTable('homework_reviews', {
  id: createId(),
  submissionId: varchar('submission_id', { length: 36 }).notNull().references(() => homeworkSubmissions.id, { onDelete: 'cascade' }),
  reviewerTeacherId: varchar('reviewer_teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  reviewResult: varchar('review_result', { length: 16 }).notNull(),
  finalAccuracyPct: numeric('final_accuracy_pct', { precision: 5, scale: 2 }),
  finalErrorSummary: text('final_error_summary'),
  finalSuggestion: text('final_suggestion'),
  publishToFamily: varchar('publish_to_family', { length: 5 }).default('false').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_reviews_submission_id_uq').on(table.submissionId)]);

export const homeworkReviewTags = pgTable('homework_review_error_items', {
  id: createId(),
  reviewId: varchar('review_id', { length: 36 }).notNull().references(() => homeworkReviews.id, { onDelete: 'cascade' }),
  errorTaxonomyId: varchar('error_taxonomy_id', { length: 36 }).notNull().references(() => errorTaxonomies.id, { onDelete: 'restrict' }),
  weight: numeric('weight', { precision: 8, scale: 2 }).default('1').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_review_error_items_review_taxonomy_uq').on(table.reviewId, table.errorTaxonomyId)]);

export const homeworkSubmissionFiles = pgTable('homework_submission_files', {
  id: createId(),
  submissionId: varchar('submission_id', { length: 36 }).notNull().references(() => homeworkSubmissions.id, { onDelete: 'cascade' }),
  fileId: varchar('file_id', { length: 36 }).notNull().references(() => fileAssets.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_submission_files_submission_file_uq').on(table.submissionId, table.fileId)]);

export const homeworkReviewDrafts = pgTable('homework_review_drafts', {
  id: createId(),
  submissionId: varchar('submission_id', { length: 36 }).notNull().references(() => homeworkSubmissions.id, { onDelete: 'cascade' }),
  reviewerTeacherId: varchar('reviewer_teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  reviewResult: varchar('review_result', { length: 16 }),
  finalAccuracyPct: numeric('final_accuracy_pct', { precision: 5, scale: 2 }),
  finalErrorSummary: text('final_error_summary'),
  finalSuggestion: text('final_suggestion'),
  publishToFamily: varchar('publish_to_family', { length: 5 }).default('false').notNull(),
  finalErrorItems: jsonb('final_error_items')
    .$type<Array<{ errorTaxonomyId: string; weight: number; note?: string }>>()
    .default(sql`'[]'::jsonb`)
    .notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_review_drafts_submission_id_uq').on(table.submissionId)]);

export const homeworkOutboxEvents = pgTable('homework_outbox_events', {
  id: createId(),
  eventName: varchar('event_name', { length: 32 }).notNull(),
  bizId: varchar('biz_id', { length: 36 }).notNull(),
  payload: jsonbDefault<Record<string, unknown>>('payload'),
  status: varchar('status', { length: 16 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
