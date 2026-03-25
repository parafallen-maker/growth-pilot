import { createId, date, pgTable, text, timestamp, uniqueIndex, varchar, activeStatus } from './base';
import { campuses, schoolTerms } from './settings';

export const teachers = pgTable('teachers', {
  id: createId(),
  campusId: varchar('campus_id', { length: 36 }).notNull().references(() => campuses.id, { onDelete: 'restrict' }),
  userId: varchar('user_id', { length: 36 }),
  employeeNo: varchar('employee_no', { length: 32 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  mobile: varchar('mobile', { length: 32 }),
  email: varchar('email', { length: 128 }),
  hireDate: date('hire_date'),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  leadSubject: varchar('lead_subject', { length: 32 }),
  avatarFileId: varchar('avatar_file_id', { length: 36 }),
  bio: text('bio'),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('teachers_employee_no_uq').on(table.employeeNo)]);

export const teacherAssignments = pgTable('teacher_shifts', {
  id: createId(),
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  campusId: varchar('campus_id', { length: 36 }).notNull().references(() => campuses.id, { onDelete: 'cascade' }),
  weekday: varchar('weekday', { length: 8 }).notNull(),
  startTime: varchar('start_time', { length: 16 }).notNull(),
  endTime: varchar('end_time', { length: 16 }).notNull(),
  shiftType: varchar('shift_type', { length: 32 }).default('duty').notNull(),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const developmentRecords = pgTable('teacher_development_records', {
  id: createId(),
  teacherId: varchar('teacher_id', { length: 36 }).notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  recordType: varchar('record_type', { length: 32 }).notNull(),
  title: varchar('title', { length: 128 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  observerTeacherId: varchar('observer_teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  strengths: text('strengths'),
  improvements: text('improvements'),
  actionItems: text('action_items'),
  dueDate: date('due_date'),
  status: varchar('status', { length: 16 }).default('open').notNull(),
  attachmentFileId: varchar('attachment_file_id', { length: 36 }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
