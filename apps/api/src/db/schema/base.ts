import { index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar, boolean, date, bigint, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const createId = (name = 'id') => uuid(name).defaultRandom().primaryKey();
export const activeStatus = (name = 'status') => varchar(name, { length: 16 }).default('active').notNull();
export const jsonbDefault = <T = unknown>(name: string) => jsonb(name).$type<T>().default(sql`'{}'::jsonb`).notNull();

export { pgTable, index, integer, jsonb, numeric, text, timestamp, uniqueIndex, uuid, varchar, boolean, date, bigint, primaryKey, sql };
