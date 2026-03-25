import { createId, date, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar, activeStatus } from './base';
import { campuses, schoolTerms } from './settings';
import { teachers } from './teachers';
import { families } from './families';

export const students = pgTable('students', {
  id: createId(),
  studentNo: varchar('student_no', { length: 32 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  gender: varchar('gender', { length: 16 }),
  birthDate: date('birth_date'),
  schoolName: varchar('school_name', { length: 128 }),
  gradeLabel: varchar('grade_label', { length: 32 }).notNull(),
  className: varchar('class_name', { length: 64 }),
  homeCampusId: varchar('home_campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  familyId: varchar('family_id', { length: 36 }).references(() => families.id, { onDelete: 'set null' }),
  photoFileId: varchar('photo_file_id', { length: 36 }),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  profileNotes: text('profile_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('students_student_no_uq').on(table.studentNo)]);

export const studentEnrollments = pgTable('student_enrollments', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  campusId: varchar('campus_id', { length: 36 }).notNull().references(() => campuses.id, { onDelete: 'cascade' }),
  termId: varchar('term_id', { length: 36 }).notNull().references(() => schoolTerms.id, { onDelete: 'cascade' }),
  primaryTeacherId: varchar('primary_teacher_id', { length: 36 }).references(() => teachers.id, { onDelete: 'set null' }),
  groupId: varchar('group_id', { length: 36 }),
  enrollDate: date('enroll_date').notNull(),
  leaveDate: date('leave_date'),
  leaveReason: text('leave_reason'),
  status: activeStatus(),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('student_enrollments_student_campus_term_uq').on(table.studentId, table.campusId, table.termId)]);

export const studentLabels = pgTable('student_tags', {
  id: createId(),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  tagCode: varchar('tag_code', { length: 64 }).notNull(),
  tagName: varchar('tag_name', { length: 64 }).notNull(),
  tagColor: varchar('tag_color', { length: 16 }),
  sourceType: varchar('source_type', { length: 32 }).default('manual').notNull(),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('student_tags_student_tag_code_uq').on(table.studentId, table.tagCode)]);
