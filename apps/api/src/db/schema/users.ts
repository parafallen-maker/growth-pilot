import { createId, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar, activeStatus } from './base';
import { campuses } from './settings';

export const roles = pgTable('roles', {
  id: createId(),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  scopeLevel: varchar('scope_level', { length: 16 }).default('campus').notNull(),
  status: activeStatus(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('roles_code_uq').on(table.code)]);

export const permissions = pgTable('permissions', {
  id: createId(),
  code: varchar('code', { length: 128 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  module: varchar('module', { length: 64 }).notNull(),
  action: varchar('action', { length: 32 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('permissions_code_uq').on(table.code)]);

export const users = pgTable('users', {
  id: createId(),
  username: varchar('username', { length: 64 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 64 }).notNull(),
  mobile: varchar('mobile', { length: 32 }),
  email: varchar('email', { length: 128 }),
  avatarUrl: text('avatar_url'),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('users_username_uq').on(table.username)]);

export const userRoles = pgTable('user_roles', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: varchar('role_id', { length: 36 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.roleId, table.campusId], name: 'user_roles_pk' })]);
