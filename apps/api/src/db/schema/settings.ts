import { activeStatus, createId, date, integer, jsonbDefault, pgTable, text, timestamps, uniqueIndex, varchar } from './base';

export const campuses = pgTable('campuses', {
  id: createId(),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).default('Asia/Shanghai').notNull(),
  address: text('address'),
  contactPhone: varchar('contact_phone', { length: 32 }),
  status: activeStatus(),
  sortOrder: integer('sort_order').default(100).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex('campuses_code_uq').on(table.code)]);

export const schoolTerms = pgTable('school_terms', {
  id: createId(),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  ...timestamps,
}, (table) => [uniqueIndex('school_terms_code_uq').on(table.code)]);

export const systemDictionaries = pgTable('system_dictionaries', {
  id: createId(),
  dictType: varchar('dict_type', { length: 64 }).notNull(),
  code: varchar('code', { length: 64 }).notNull(),
  label: varchar('label', { length: 128 }).notNull(),
  value: varchar('value', { length: 255 }),
  extra: jsonbDefault('extra'),
  sortOrder: integer('sort_order').default(100).notNull(),
  active: integer('active').default(1).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex('system_dictionaries_type_code_uq').on(table.dictType, table.code)]);
