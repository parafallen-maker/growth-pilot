import { bigint, boolean, date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const createId = (name = 'id') => uuid(name).defaultRandom().primaryKey();
export const activeStatus = (name = 'status') => varchar(name, { length: 16 }).default('active').notNull();
export const jsonbDefault = <T = unknown>(name: string) => jsonb(name).$type<T>().default(sql`'{}'::jsonb`).notNull();

export { pgTable, index, integer, jsonb, numeric, text, timestamp, unique, uniqueIndex, uuid, varchar, boolean, date, bigint, primaryKey, sql };
