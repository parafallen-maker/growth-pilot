import { bigint, createId, integer, jsonbDefault, pgTable, text, timestamp, uniqueIndex, varchar } from './base';

export const jobs = pgTable('ai_jobs', {
  id: createId(),
  jobType: varchar('job_type', { length: 64 }).notNull(),
  bizType: varchar('biz_type', { length: 64 }).notNull(),
  bizId: varchar('biz_id', { length: 36 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }),
  status: varchar('status', { length: 16 }).default('queued').notNull(),
  priority: integer('priority').default(100).notNull(),
  payload: jsonbDefault('payload'),
  result: jsonbDefault('result'),
  errorMessage: text('error_message'),
  attempts: integer('attempts').default(0).notNull(),
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const fileAssets = pgTable('file_assets', {
  id: createId(),
  storageProvider: varchar('storage_provider', { length: 32 }).default('s3').notNull(),
  bucketName: varchar('bucket_name', { length: 128 }).notNull(),
  objectKey: varchar('object_key', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).default(0).notNull(),
  checksum: varchar('checksum', { length: 128 }),
  uploadedBy: varchar('uploaded_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('file_assets_bucket_object_key_uq').on(table.bucketName, table.objectKey)]);
