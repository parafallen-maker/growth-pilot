import { createId, pgTable, text, timestamp, uniqueIndex, varchar } from './base';
import { families } from './families';
import { students } from './students';

export const communicationRecords = pgTable('communication_records', {
  id: createId(),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 36 }).references(() => students.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 16 }).notNull(),
  direction: varchar('direction', { length: 16 }).notNull(),
  topic: varchar('topic', { length: 128 }),
  summary: text('summary').notNull(),
  nextAction: text('next_action'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messageTemplates = pgTable('message_templates', {
  id: createId(),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  channel: varchar('channel', { length: 16 }).notNull(),
  subjectTemplate: varchar('subject_template', { length: 255 }),
  bodyTemplate: text('body_template').notNull(),
  active: varchar('active', { length: 5 }).default('true').notNull(),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('message_templates_code_uq').on(table.code)]);

export const messageTasks = pgTable('outbound_messages', {
  id: createId(),
  templateId: varchar('template_id', { length: 36 }).references(() => messageTemplates.id, { onDelete: 'set null' }),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 36 }).references(() => students.id, { onDelete: 'set null' }),
  sourceType: varchar('source_type', { length: 32 }),
  sourceId: varchar('source_id', { length: 36 }),
  channel: varchar('channel', { length: 16 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  status: varchar('status', { length: 16 }).default('draft').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentByUserId: varchar('sent_by_user_id', { length: 36 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
