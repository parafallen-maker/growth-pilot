import { index, pgTable, text, timestamp, timestamps, varchar } from './base';

export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  taskType: varchar('task_type', { length: 64 }).notNull(),
  sourceType: varchar('source_type', { length: 64 }),
  sourceId: varchar('source_id', { length: 64 }),
  studentId: varchar('student_id', { length: 36 }),
  familyId: varchar('family_id', { length: 36 }),
  teacherId: varchar('teacher_id', { length: 36 }),
  ownerUserId: varchar('owner_user_id', { length: 36 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 16 }).default('medium').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  status: varchar('status', { length: 16 }).default('open').notNull(),
  resultNote: text('result_note'),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  index('tasks_owner_status_due_idx').on(table.ownerUserId, table.status, table.dueAt),
  index('tasks_student_status_idx').on(table.studentId, table.status),
  index('tasks_family_status_idx').on(table.familyId, table.status),
  index('tasks_teacher_status_idx').on(table.teacherId, table.status),
]);

export const alerts = pgTable('alerts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  alertType: varchar('alert_type', { length: 64 }).notNull(),
  alertLevel: varchar('alert_level', { length: 16 }).default('medium').notNull(),
  sourceType: varchar('source_type', { length: 64 }),
  sourceId: varchar('source_id', { length: 64 }),
  studentId: varchar('student_id', { length: 36 }),
  familyId: varchar('family_id', { length: 36 }),
  invoiceId: varchar('invoice_id', { length: 36 }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 16 }).default('open').notNull(),
  resolverUserId: varchar('resolver_user_id', { length: 36 }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
}, (table) => [
  index('alerts_status_level_created_idx').on(table.status, table.alertLevel, table.createdAt),
  index('alerts_student_status_idx').on(table.studentId, table.status),
  index('alerts_family_status_idx').on(table.familyId, table.status),
  index('alerts_invoice_status_idx').on(table.invoiceId, table.status),
]);
