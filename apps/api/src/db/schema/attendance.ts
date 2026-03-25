import { createId, date, integer, pgTable, text, timestamp, uniqueIndex, varchar } from './base';
import { campuses, schoolTerms } from './settings';
import { students } from './students';

export const devices = pgTable('devices', {
  id: createId(),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  serialNo: varchar('serial_no', { length: 64 }).notNull(),
  deviceType: varchar('device_type', { length: 32 }).default('beacon').notNull(),
  status: varchar('status', { length: 16 }).default('idle').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('devices_serial_no_uq').on(table.serialNo)]);

export const deviceBindings = pgTable('student_device_bindings', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  deviceId: varchar('device_id', { length: 36 }).notNull().references(() => devices.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  boundAt: timestamp('bound_at', { withTimezone: true }).defaultNow().notNull(),
  unboundAt: timestamp('unbound_at', { withTimezone: true }),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceEvents = pgTable('attendance_events', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  campusId: varchar('campus_id', { length: 36 }).notNull().references(() => campuses.id, { onDelete: 'cascade' }),
  deviceId: varchar('device_id', { length: 36 }).references(() => devices.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 32 }).notNull(),
  eventTime: timestamp('event_time', { withTimezone: true }).notNull(),
  operatorUserId: varchar('operator_user_id', { length: 36 }),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homeworkTimeSessions = pgTable('homework_time_sessions', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 32 }).notNull(),
  deviceId: varchar('device_id', { length: 36 }).references(() => devices.id, { onDelete: 'set null' }),
  sourceType: varchar('source_type', { length: 16 }).default('manual').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  createdBy: varchar('created_by', { length: 36 }),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homeworkTimeDailyStats = pgTable('homework_time_daily_stats', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  statDate: date('stat_date').notNull(),
  subject: varchar('subject', { length: 32 }).notNull(),
  totalMinutes: integer('total_minutes').default(0).notNull(),
  sessionCount: integer('session_count').default(0).notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('homework_time_daily_stats_student_date_subject_uq').on(table.studentId, table.statDate, table.subject)]);
