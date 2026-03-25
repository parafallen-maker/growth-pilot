import { createId, date, pgTable, text, timestamp, uniqueIndex, varchar, activeStatus } from './base';

export const families = pgTable('families', {
  id: createId(),
  familyCode: varchar('family_code', { length: 32 }).notNull(),
  familyName: varchar('family_name', { length: 128 }),
  primaryContactName: varchar('primary_contact_name', { length: 64 }),
  primaryMobile: varchar('primary_mobile', { length: 32 }),
  secondaryMobile: varchar('secondary_mobile', { length: 32 }),
  familyStructure: varchar('family_structure', { length: 32 }),
  address: text('address'),
  communicationPreference: varchar('communication_preference', { length: 32 }).default('wechat'),
  notes: text('notes'),
  status: activeStatus(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('families_family_code_uq').on(table.familyCode)]);

export const guardians = pgTable('guardians', {
  id: createId(),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  relation: varchar('relation', { length: 32 }).notNull(),
  mobile: varchar('mobile', { length: 32 }),
  wechatId: varchar('wechat_id', { length: 64 }),
  email: varchar('email', { length: 128 }),
  occupation: varchar('occupation', { length: 64 }),
  isPrimary: varchar('is_primary', { length: 5 }).default('false').notNull(),
  isEmergency: varchar('is_emergency', { length: 5 }).default('false').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const familyTasks = pgTable('family_tasks', {
  id: createId(),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 36 }),
  sourceType: varchar('source_type', { length: 32 }),
  sourceId: varchar('source_id', { length: 36 }),
  title: varchar('title', { length: 128 }).notNull(),
  description: text('description'),
  frequency: varchar('frequency', { length: 16 }).default('once').notNull(),
  assigneeGuardianId: varchar('assignee_guardian_id', { length: 36 }).references(() => guardians.id, { onDelete: 'set null' }),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  status: varchar('status', { length: 16 }).default('todo').notNull(),
  completionNote: text('completion_note'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
