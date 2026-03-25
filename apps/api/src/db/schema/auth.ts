import { createId, pgTable, text, timestamp, uniqueIndex, varchar } from './base';
import { users } from './users';

export const authSessions = pgTable('auth_sessions', {
  id: createId(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessTokenId: varchar('access_token_id', { length: 64 }).notNull(),
  refreshTokenId: varchar('refresh_token_id', { length: 64 }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('auth_sessions_session_id_uq').on(table.sessionId),
  uniqueIndex('auth_sessions_access_token_id_uq').on(table.accessTokenId),
  uniqueIndex('auth_sessions_refresh_token_id_uq').on(table.refreshTokenId),
]);
