import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type {
  BillingContract,
  BillingContractItem,
  BillingInvoice,
  BillingInvoiceItem,
  BillingPayment,
  BillingProduct,
  BillingRefund,
} from '@growthpilot/schema/index';
import { PersistentJsonStore } from '../../../common/persistent-json.store';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';

type BillingRenewalTask = {
  id: string;
  familyId: string;
  studentId: string;
  campusId?: string | null;
  termId?: string | null;
  contractId?: string | null;
  ownerUserId?: string | null;
  expectedEndDate?: string | null;
  status: 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
  lastContactAt?: string | null;
  nextFollowUpAt?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

interface BillingState {
  products: BillingProduct[];
  contracts: BillingContract[];
  contractItems: BillingContractItem[];
  invoices: BillingInvoice[];
  invoiceItems: BillingInvoiceItem[];
  payments: BillingPayment[];
  refunds: BillingRefund[];
  renewals: BillingRenewalTask[];
}

interface BillingRepositoryPort {
  listProducts(): Promise<BillingProduct[]>;
  listContracts(): Promise<BillingContract[]>;
  listInvoices(): Promise<BillingInvoice[]>;
  listPayments(): Promise<BillingPayment[]>;
  listRefunds(): Promise<BillingRefund[]>;
  listRenewals(): Promise<BillingRenewalTask[]>;
  findContractById(contractId: string): Promise<BillingContract | undefined>;
  findInvoiceById(invoiceId: string): Promise<BillingInvoice | undefined>;
  findPaymentById(paymentId: string): Promise<BillingPayment | undefined>;
  findRefundById(refundId: string): Promise<BillingRefund | undefined>;
  findPaymentByIdempotencyKey(idempotencyKey: string): Promise<BillingPayment | undefined>;
  listContractItems(contractId: string): Promise<BillingContractItem[]>;
  listInvoiceItems(invoiceId: string): Promise<BillingInvoiceItem[]>;
  listPaymentsByInvoice(invoiceId: string): Promise<BillingPayment[]>;
  listRefundsByPayment(paymentId: string): Promise<BillingRefund[]>;
  createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingProduct>;
  createContract(input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>): Promise<{ contract: BillingContract; items: BillingContractItem[] }>;
  createInvoice(input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>): Promise<{ invoice: BillingInvoice; items: BillingInvoiceItem[] }>;
  createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingPayment>;
  createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingRefund>;
  updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>): Promise<BillingInvoice>;
  createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingRenewalTask>;
  updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>): Promise<BillingRenewalTask>;
  runInTransaction<T>(runner: () => Promise<T> | T): Promise<T>;
}

const createInitialState = (): BillingState => ({
  products: [{ id: 'product-001', code: 'CARE-TERM-001', name: '托管 + 作业辅导', category: 'care', billingMode: 'term', priceCents: 380000, unit: 'term', description: '春季学期托管套餐', status: 'active', createdAt: '2026-03-20T10:00:00+08:00', updatedAt: '2026-03-20T10:00:00+08:00' }],
  contracts: [{ id: 'contract-001', contractNo: 'CT2026030001', campusId: 'campus-001', termId: 'term-2026-spring', familyId: 'family-001', studentId: 'student-001', signDate: '2026-03-20', startDate: '2026-03-25', endDate: '2026-06-30', totalAmountCents: 380000, discountAmountCents: 20000, payableAmountCents: 360000, status: 'active', remark: '样例合同', createdAt: '2026-03-20T10:00:00+08:00', updatedAt: '2026-03-20T10:00:00+08:00' }],
  contractItems: [{ id: 'contract-item-001', contractId: 'contract-001', productId: 'product-001', itemName: '托管 + 作业辅导', unitPriceCents: 380000, quantity: 1, subtotalCents: 380000, createdAt: '2026-03-20T10:00:00+08:00' }],
  invoices: [{ id: 'invoice-001', invoiceNo: 'IV202603230001', contractId: 'contract-001', familyId: 'family-001', studentId: 'student-001', billingPeriod: '2026-S1', issueDate: '2026-03-23', dueDate: '2026-03-25', amountCents: 360000, status: 'issued', note: '首期账单', createdAt: '2026-03-23T09:00:00+08:00', updatedAt: '2026-03-23T09:00:00+08:00' }],
  invoiceItems: [{ id: 'invoice-item-001', invoiceId: 'invoice-001', itemName: '托管 + 作业辅导', productId: 'product-001', quantity: 1, unitPriceCents: 360000, amountCents: 360000, createdAt: '2026-03-23T09:00:00+08:00' }],
  payments: [],
  refunds: [],
  renewals: [{ id: 'renewal-001', familyId: 'family-001', studentId: 'student-001', campusId: 'campus-001', termId: 'term-2026-spring', contractId: 'contract-001', ownerUserId: 'user-service-001', expectedEndDate: '2026-06-30', status: 'todo', lastContactAt: null, nextFollowUpAt: '2026-06-10T10:00:00+08:00', note: '首轮续费跟进', createdAt: '2026-03-24T10:00:00+08:00', updatedAt: '2026-03-24T10:00:00+08:00' }],
});

class FileBillingRepository implements BillingRepositoryPort {
  private readonly store: PersistentJsonStore<BillingState>;
  constructor(filePath = '.data/billing.json') { this.store = new PersistentJsonStore<BillingState>(filePath, createInitialState); }
  private get state() { return this.store.get(); }
  async listProducts() { return [...this.state.products]; }
  async listContracts() { return [...this.state.contracts]; }
  async listInvoices() { return [...this.state.invoices]; }
  async listPayments() { return [...this.state.payments]; }
  async listRefunds() { return [...this.state.refunds]; }
  async listRenewals() { return [...this.state.renewals]; }
  async findContractById(contractId: string) { return this.state.contracts.find((item) => item.id === contractId); }
  async findInvoiceById(invoiceId: string) { return this.state.invoices.find((item) => item.id === invoiceId); }
  async findPaymentById(paymentId: string) { return this.state.payments.find((item) => item.id === paymentId); }
  async findRefundById(refundId: string) { return this.state.refunds.find((item) => item.id === refundId); }
  async findPaymentByIdempotencyKey(idempotencyKey: string) { return this.state.payments.find((item) => item.idempotencyKey === idempotencyKey); }
  async listContractItems(contractId: string) { return this.state.contractItems.filter((item) => item.contractId === contractId); }
  async listInvoiceItems(invoiceId: string) { return this.state.invoiceItems.filter((item) => item.invoiceId === invoiceId); }
  async listPaymentsByInvoice(invoiceId: string) { return this.state.payments.filter((item) => item.invoiceId === invoiceId); }
  async listRefundsByPayment(paymentId: string) { return this.state.refunds.filter((item) => item.paymentId === paymentId); }
  async createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>) { let created!: BillingProduct; this.store.update((state) => { this.ensureUnique('product code', state.products.some((item) => item.code === input.code)); const now = new Date().toISOString(); created = { ...input, id: `product-${String(state.products.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now }; state.products.unshift(created); }); return created; }
  async createContract(input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>) { let created!: { contract: BillingContract; items: BillingContractItem[] }; this.store.update((state) => { this.ensureUnique('contractNo', state.contracts.some((item) => item.contractNo === input.contractNo)); const now = new Date().toISOString(); const contractId = `contract-${String(state.contracts.length + 1).padStart(3, '0')}`; const contract: BillingContract = { ...input, id: contractId, createdAt: now, updatedAt: now }; const contractItems = items.map((item, index) => ({ ...item, id: `contract-item-${String(state.contractItems.length + index + 1).padStart(3, '0')}`, contractId, createdAt: now } satisfies BillingContractItem)); state.contracts.unshift(contract); state.contractItems.unshift(...contractItems); created = { contract, items: contractItems }; }); return created; }
  async createInvoice(input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>) { let created!: { invoice: BillingInvoice; items: BillingInvoiceItem[] }; this.store.update((state) => { this.ensureUnique('invoiceNo', state.invoices.some((item) => item.invoiceNo === input.invoiceNo)); const now = new Date().toISOString(); const invoiceId = `invoice-${String(state.invoices.length + 1).padStart(3, '0')}`; const invoice: BillingInvoice = { ...input, id: invoiceId, createdAt: now, updatedAt: now }; const invoiceItems = items.map((item, index) => ({ ...item, id: `invoice-item-${String(state.invoiceItems.length + index + 1).padStart(3, '0')}`, invoiceId, createdAt: now } satisfies BillingInvoiceItem)); state.invoices.unshift(invoice); state.invoiceItems.unshift(...invoiceItems); created = { invoice, items: invoiceItems }; }); return created; }
  async createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>) { let created!: BillingPayment; this.store.update((state) => { this.ensureUnique('paymentNo', state.payments.some((item) => item.paymentNo === input.paymentNo)); if (input.idempotencyKey) this.ensureUnique('idempotencyKey', state.payments.some((item) => item.idempotencyKey === input.idempotencyKey), 'PAY_409'); const now = new Date().toISOString(); created = { ...input, id: `payment-${String(state.payments.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now }; state.payments.unshift(created); }); return created; }
  async createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>) { let created!: BillingRefund; this.store.update((state) => { this.ensureUnique('refundNo', state.refunds.some((item) => item.refundNo === input.refundNo)); const now = new Date().toISOString(); created = { ...input, id: `refund-${String(state.refunds.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now }; state.refunds.unshift(created); }); return created; }
  async updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>) { let updated!: BillingInvoice; this.store.update((state) => { const invoice = state.invoices.find((item) => item.id === invoiceId); if (!invoice) throw new NotFoundException(`invoice ${invoiceId} not found`); Object.assign(invoice, patch, { updatedAt: new Date().toISOString() }); updated = invoice; }); return updated; }
  async createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>) { let created!: BillingRenewalTask; this.store.update((state) => { const now = new Date().toISOString(); created = { ...input, id: `renewal-${String(state.renewals.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now }; state.renewals.unshift(created); }); return created; }
  async updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>) { let updated!: BillingRenewalTask; this.store.update((state) => { const renewal = state.renewals.find((item) => item.id === renewalId); if (!renewal) throw new NotFoundException(`renewal ${renewalId} not found`); Object.assign(renewal, patch, { updatedAt: new Date().toISOString() }); updated = renewal; }); return updated; }
  async runInTransaction<T>(runner: () => Promise<T> | T) { const snapshot = this.store.snapshot(); try { return await runner(); } catch (error) { this.store.replace(snapshot); throw error; } }
  private ensureUnique(field: string, exists: boolean, errorCode = 'DATA_409') { if (exists) throw new ConflictException({ code: errorCode, message: `${field} already exists` }); }
}

class DbBillingRepository implements BillingRepositoryPort {
  private readonly db = createDb();
  async listProducts() { const rows = await this.db.select().from(dbSchema.billingProducts).orderBy(asc(dbSchema.billingProducts.createdAt)); return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, category: row.category, billingMode: row.billingMode, priceCents: row.priceCents, unit: row.unit, description: row.description ?? undefined, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async listContracts() { const rows = await this.db.select().from(dbSchema.contracts).orderBy(asc(dbSchema.contracts.createdAt)); return rows.map((row) => ({ id: row.id, contractNo: row.contractNo, campusId: row.campusId ?? null, termId: row.termId ?? null, familyId: row.familyId, studentId: row.studentId, signDate: row.signDate, startDate: row.startDate, endDate: row.endDate, totalAmountCents: row.totalAmountCents, discountAmountCents: row.discountAmountCents, payableAmountCents: row.payableAmountCents, status: row.status, remark: row.remark ?? undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async listInvoices() { const rows = await this.db.select().from(dbSchema.invoices).orderBy(asc(dbSchema.invoices.createdAt)); return rows.map((row) => ({ id: row.id, invoiceNo: row.invoiceNo, contractId: row.contractId ?? null, familyId: row.familyId, studentId: row.studentId, billingPeriod: row.billingPeriod ?? undefined, issueDate: row.issueDate, dueDate: row.dueDate ?? undefined, amountCents: row.amountCents, status: row.status, note: row.note ?? undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async listPayments() { const rows = await this.db.select().from(dbSchema.payments).orderBy(asc(dbSchema.payments.createdAt)); return rows.map((row) => ({ id: row.id, invoiceId: row.invoiceId, paymentNo: row.paymentNo, paidAmountCents: row.paidAmountCents, paymentTime: row.paymentTime.toISOString(), channel: row.channel, transactionNo: row.transactionNo ?? null, status: row.status, idempotencyKey: row.idempotencyKey ?? null, remark: row.remark ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async listRefunds() { const rows = await this.db.select().from(dbSchema.refunds).orderBy(asc(dbSchema.refunds.createdAt)); return rows.map((row) => ({ id: row.id, paymentId: row.paymentId ?? '', refundNo: row.refundNo, refundAmountCents: row.refundAmountCents, refundTime: row.refundTime.toISOString(), reason: row.reason ?? null, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async listRenewals() { const rows = await this.db.select().from(dbSchema.renewals).orderBy(asc(dbSchema.renewals.createdAt)); const contracts = await this.listContracts(); const byContract = new Map(contracts.map((item) => [item.id, item])); return rows.map((row) => ({ id: row.id, familyId: row.familyId, studentId: row.studentId, campusId: row.contractId ? (byContract.get(row.contractId)?.campusId ?? null) : null, termId: row.contractId ? (byContract.get(row.contractId)?.termId ?? null) : null, contractId: row.contractId ?? null, ownerUserId: row.ownerUserId ?? null, expectedEndDate: row.expectedEndDate ?? null, status: row.status as BillingRenewalTask['status'], lastContactAt: row.lastContactAt?.toISOString() ?? null, nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null, note: row.note ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })); }
  async findContractById(contractId: string) { return (await this.listContracts()).find((item) => item.id === contractId); }
  async findInvoiceById(invoiceId: string) { return (await this.listInvoices()).find((item) => item.id === invoiceId); }
  async findPaymentById(paymentId: string) { return (await this.listPayments()).find((item) => item.id === paymentId); }
  async findRefundById(refundId: string) { return (await this.listRefunds()).find((item) => item.id === refundId); }
  async findPaymentByIdempotencyKey(idempotencyKey: string) { const rows = await this.db.select().from(dbSchema.payments).where(eq(dbSchema.payments.idempotencyKey, idempotencyKey)).limit(1); return rows[0] ? { id: rows[0].id, invoiceId: rows[0].invoiceId, paymentNo: rows[0].paymentNo, paidAmountCents: rows[0].paidAmountCents, paymentTime: rows[0].paymentTime.toISOString(), channel: rows[0].channel, transactionNo: rows[0].transactionNo ?? null, status: rows[0].status, idempotencyKey: rows[0].idempotencyKey ?? null, remark: rows[0].remark ?? null, createdAt: rows[0].createdAt.toISOString(), updatedAt: rows[0].updatedAt.toISOString() } : undefined; }
  async listContractItems(contractId: string) { const rows = await this.db.select().from(dbSchema.contractItems).where(eq(dbSchema.contractItems.contractId, contractId)).orderBy(asc(dbSchema.contractItems.createdAt)); return rows.map((row) => ({ id: row.id, contractId: row.contractId, productId: row.productId ?? null, itemName: row.itemName, unitPriceCents: row.unitPriceCents, quantity: Number(row.quantity), subtotalCents: row.subtotalCents, createdAt: row.createdAt.toISOString() })); }
  async listInvoiceItems(invoiceId: string) { const rows = await this.db.select().from(dbSchema.invoiceItems).where(eq(dbSchema.invoiceItems.invoiceId, invoiceId)).orderBy(asc(dbSchema.invoiceItems.createdAt)); return rows.map((row) => ({ id: row.id, invoiceId: row.invoiceId, itemName: row.itemName, productId: row.productId ?? null, quantity: Number(row.quantity), unitPriceCents: row.unitPriceCents, amountCents: row.amountCents, remark: row.remark ?? undefined, createdAt: row.createdAt.toISOString() })); }
  async listPaymentsByInvoice(invoiceId: string) { return (await this.listPayments()).filter((item) => item.invoiceId === invoiceId); }
  async listRefundsByPayment(paymentId: string) { return (await this.listRefunds()).filter((item) => item.paymentId === paymentId); }
  async createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>) { const [row] = await this.db.insert(dbSchema.billingProducts).values({ code: input.code, name: input.name, category: input.category, billingMode: input.billingMode, priceCents: input.priceCents, unit: input.unit ?? 'term', description: input.description ?? null, status: input.status, createdAt: new Date(), updatedAt: new Date() }).returning(); return (await this.findProductById(row.id))!; }
  async createContract(input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>) { return this.db.transaction(async (tx) => { const [contract] = await tx.insert(dbSchema.contracts).values({ contractNo: input.contractNo, campusId: input.campusId ?? null, termId: input.termId ?? null, familyId: input.familyId, studentId: input.studentId, signDate: input.signDate, startDate: input.startDate, endDate: input.endDate, totalAmountCents: input.totalAmountCents, discountAmountCents: input.discountAmountCents, payableAmountCents: input.payableAmountCents, status: input.status, remark: input.remark ?? null, createdAt: new Date(), updatedAt: new Date() }).returning(); if (items.length) await tx.insert(dbSchema.contractItems).values(items.map((item) => ({ contractId: contract.id, productId: item.productId ?? null, itemName: item.itemName, unitPriceCents: item.unitPriceCents, quantity: String(item.quantity), subtotalCents: item.subtotalCents, createdAt: new Date() }))); return { contract: (await this.findContractById(contract.id))!, items: await this.listContractItems(contract.id) }; }); }
  async createInvoice(input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>) { return this.db.transaction(async (tx) => { const [invoice] = await tx.insert(dbSchema.invoices).values({ invoiceNo: input.invoiceNo, contractId: input.contractId ?? null, familyId: input.familyId, studentId: input.studentId, billingPeriod: input.billingPeriod ?? null, issueDate: input.issueDate, dueDate: input.dueDate ?? null, amountCents: input.amountCents, status: input.status, note: input.note ?? null, createdAt: new Date(), updatedAt: new Date() }).returning(); if (items.length) await tx.insert(dbSchema.invoiceItems).values(items.map((item) => ({ invoiceId: invoice.id, itemName: item.itemName, productId: item.productId ?? null, quantity: String(item.quantity), unitPriceCents: item.unitPriceCents, amountCents: item.amountCents, remark: item.remark ?? null, createdAt: new Date() }))); return { invoice: (await this.findInvoiceById(invoice.id))!, items: await this.listInvoiceItems(invoice.id) }; }); }
  async createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>) { const [row] = await this.db.insert(dbSchema.payments).values({ invoiceId: input.invoiceId, paymentNo: input.paymentNo, paidAmountCents: input.paidAmountCents, paymentTime: new Date(input.paymentTime), channel: input.channel, transactionNo: input.transactionNo ?? null, status: input.status, idempotencyKey: input.idempotencyKey ?? null, remark: input.remark ?? null, createdAt: new Date(), updatedAt: new Date() }).returning(); return (await this.findPaymentById(row.id))!; }
  async createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>) { const [row] = await this.db.insert(dbSchema.refunds).values({ paymentId: input.paymentId, refundNo: input.refundNo, refundAmountCents: input.refundAmountCents, refundTime: new Date(input.refundTime), reason: input.reason ?? null, status: input.status, createdAt: new Date(), updatedAt: new Date() }).returning(); return (await this.findRefundById(row.id))!; }
  async updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>) { await this.db.update(dbSchema.invoices).set({ status: patch.status, note: patch.note ?? null, updatedAt: new Date() }).where(eq(dbSchema.invoices.id, invoiceId)); const invoice = await this.findInvoiceById(invoiceId); if (!invoice) throw new NotFoundException(`invoice ${invoiceId} not found`); return invoice; }
  async createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>) { const [row] = await this.db.insert(dbSchema.renewals).values({ familyId: input.familyId, studentId: input.studentId, contractId: input.contractId ?? null, ownerUserId: input.ownerUserId ?? null, expectedEndDate: input.expectedEndDate ?? null, status: input.status, lastContactAt: input.lastContactAt ? new Date(input.lastContactAt) : null, nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null, note: input.note ?? null, createdAt: new Date(), updatedAt: new Date() }).returning(); return (await this.listRenewals()).find((item) => item.id === row.id)!; }
  async updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>) { await this.db.update(dbSchema.renewals).set({ status: patch.status, lastContactAt: patch.lastContactAt === undefined ? undefined : (patch.lastContactAt ? new Date(patch.lastContactAt) : null), nextFollowUpAt: patch.nextFollowUpAt === undefined ? undefined : (patch.nextFollowUpAt ? new Date(patch.nextFollowUpAt) : null), note: patch.note === undefined ? undefined : patch.note, updatedAt: new Date() }).where(eq(dbSchema.renewals.id, renewalId)); const renewal = (await this.listRenewals()).find((item) => item.id === renewalId); if (!renewal) throw new NotFoundException(`renewal ${renewalId} not found`); return renewal; }
  async runInTransaction<T>(runner: () => Promise<T> | T) { return runner(); }
  private async findProductById(productId: string) { return (await this.listProducts()).find((item) => item.id === productId); }
}

@Injectable()
export class BillingRepository {
  private readonly adapter: BillingRepositoryPort;
  constructor(filePath?: string) { this.adapter = isDbPersistenceEnabled() ? new DbBillingRepository() : new FileBillingRepository(filePath); }
  listProducts() { return this.adapter.listProducts(); }
  listContracts() { return this.adapter.listContracts(); }
  listInvoices() { return this.adapter.listInvoices(); }
  listPayments() { return this.adapter.listPayments(); }
  listRefunds() { return this.adapter.listRefunds(); }
  listRenewals() { return this.adapter.listRenewals(); }
  findContractById(contractId: string) { return this.adapter.findContractById(contractId); }
  findInvoiceById(invoiceId: string) { return this.adapter.findInvoiceById(invoiceId); }
  findPaymentById(paymentId: string) { return this.adapter.findPaymentById(paymentId); }
  findRefundById(refundId: string) { return this.adapter.findRefundById(refundId); }
  findPaymentByIdempotencyKey(idempotencyKey: string) { return this.adapter.findPaymentByIdempotencyKey(idempotencyKey); }
  async getContractOrThrow(contractId: string) { const contract = await this.findContractById(contractId); if (!contract) throw new NotFoundException(`contract ${contractId} not found`); return contract; }
  async getInvoiceOrThrow(invoiceId: string) { const invoice = await this.findInvoiceById(invoiceId); if (!invoice) throw new NotFoundException(`invoice ${invoiceId} not found`); return invoice; }
  async getPaymentOrThrow(paymentId: string) { const payment = await this.findPaymentById(paymentId); if (!payment) throw new NotFoundException(`payment ${paymentId} not found`); return payment; }
  async getRefundOrThrow(refundId: string) { const refund = await this.findRefundById(refundId); if (!refund) throw new NotFoundException(`refund ${refundId} not found`); return refund; }
  async getRenewalOrThrow(renewalId: string) { const renewal = (await this.listRenewals()).find((item) => item.id === renewalId); if (!renewal) throw new NotFoundException(`renewal ${renewalId} not found`); return renewal; }
  listContractItems(contractId: string) { return this.adapter.listContractItems(contractId); }
  listInvoiceItems(invoiceId: string) { return this.adapter.listInvoiceItems(invoiceId); }
  listPaymentsByInvoice(invoiceId: string) { return this.adapter.listPaymentsByInvoice(invoiceId); }
  listRefundsByPayment(paymentId: string) { return this.adapter.listRefundsByPayment(paymentId); }
  createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>) { return this.adapter.createProduct(input); }
  createContract(input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>) { return this.adapter.createContract(input, items); }
  createInvoice(input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>) { return this.adapter.createInvoice(input, items); }
  createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>) { return this.adapter.createPayment(input); }
  createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>) { return this.adapter.createRefund(input); }
  updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>) { return this.adapter.updateInvoice(invoiceId, patch); }
  createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>) { return this.adapter.createRenewal(input); }
  updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>) { return this.adapter.updateRenewal(renewalId, patch); }
  runInTransaction<T>(runner: () => Promise<T> | T) { return this.adapter.runInTransaction(runner); }
}
