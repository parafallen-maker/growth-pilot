import { bigint, createId, date, numeric, pgTable, text, timestamp, uniqueIndex, varchar } from './base';
import { campuses, schoolTerms } from './settings';
import { families } from './families';
import { students } from './students';

export const billingProducts = pgTable('billing_products', {
  id: createId(),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(),
  billingMode: varchar('billing_mode', { length: 16 }).notNull(),
  priceCents: bigint('price_cents', { mode: 'number' }).notNull(),
  unit: varchar('unit', { length: 32 }).default('term').notNull(),
  description: text('description'),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('billing_products_code_uq').on(table.code)]);

export const contracts = pgTable('contracts', {
  id: createId(),
  contractNo: varchar('contract_no', { length: 32 }).notNull(),
  campusId: varchar('campus_id', { length: 36 }).references(() => campuses.id, { onDelete: 'set null' }),
  termId: varchar('term_id', { length: 36 }).references(() => schoolTerms.id, { onDelete: 'set null' }),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'restrict' }),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'restrict' }),
  signDate: date('sign_date').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalAmountCents: bigint('total_amount_cents', { mode: 'number' }).default(0).notNull(),
  discountAmountCents: bigint('discount_amount_cents', { mode: 'number' }).default(0).notNull(),
  payableAmountCents: bigint('payable_amount_cents', { mode: 'number' }).default(0).notNull(),
  status: varchar('status', { length: 16 }).default('active').notNull(),
  remark: text('remark'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('contracts_contract_no_uq').on(table.contractNo)]);

export const contractItems = pgTable('contract_items', {
  id: createId(),
  contractId: varchar('contract_id', { length: 36 }).notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 36 }).references(() => billingProducts.id, { onDelete: 'set null' }),
  itemName: varchar('item_name', { length: 128 }).notNull(),
  unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).default(0).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).default('1').notNull(),
  subtotalCents: bigint('subtotal_cents', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: createId(),
  invoiceNo: varchar('invoice_no', { length: 32 }).notNull(),
  contractId: varchar('contract_id', { length: 36 }).references(() => contracts.id, { onDelete: 'set null' }),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'restrict' }),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'restrict' }),
  billingPeriod: varchar('billing_period', { length: 32 }),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date'),
  amountCents: bigint('amount_cents', { mode: 'number' }).default(0).notNull(),
  status: varchar('status', { length: 16 }).default('draft').notNull(),
  note: text('note'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('invoices_invoice_no_uq').on(table.invoiceNo)]);

export const invoiceItems = pgTable('invoice_items', {
  id: createId(),
  invoiceId: varchar('invoice_id', { length: 36 }).notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  itemName: varchar('item_name', { length: 128 }).notNull(),
  productId: varchar('product_id', { length: 36 }).references(() => billingProducts.id, { onDelete: 'set null' }),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).default('1').notNull(),
  unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).default(0).notNull(),
  amountCents: bigint('amount_cents', { mode: 'number' }).default(0).notNull(),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: createId(),
  invoiceId: varchar('invoice_id', { length: 36 }).notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  paymentNo: varchar('payment_no', { length: 32 }).notNull(),
  paidAmountCents: bigint('paid_amount_cents', { mode: 'number' }).notNull(),
  paymentTime: timestamp('payment_time', { withTimezone: true }).notNull(),
  channel: varchar('channel', { length: 32 }).notNull(),
  transactionNo: varchar('transaction_no', { length: 128 }),
  status: varchar('status', { length: 16 }).default('success').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }),
  operatorUserId: varchar('operator_user_id', { length: 36 }),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('payments_payment_no_uq').on(table.paymentNo)]);

export const refunds = pgTable('refunds', {
  id: createId(),
  paymentId: varchar('payment_id', { length: 36 }).references(() => payments.id, { onDelete: 'set null' }),
  refundNo: varchar('refund_no', { length: 32 }).notNull(),
  refundAmountCents: bigint('refund_amount_cents', { mode: 'number' }).notNull(),
  refundTime: timestamp('refund_time', { withTimezone: true }).notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 16 }).default('success').notNull(),
  operatorUserId: varchar('operator_user_id', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('refunds_refund_no_uq').on(table.refundNo)]);

export const renewals = pgTable('renewal_tasks', {
  id: createId(),
  familyId: varchar('family_id', { length: 36 }).notNull().references(() => families.id, { onDelete: 'cascade' }),
  studentId: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  contractId: varchar('contract_id', { length: 36 }).references(() => contracts.id, { onDelete: 'set null' }),
  ownerUserId: varchar('owner_user_id', { length: 36 }),
  expectedEndDate: date('expected_end_date'),
  status: varchar('status', { length: 16 }).default('todo').notNull(),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
