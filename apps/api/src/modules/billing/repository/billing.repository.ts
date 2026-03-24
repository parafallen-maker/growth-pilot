import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class BillingRepository {
  private readonly store: PersistentJsonStore<BillingState>;

  constructor(filePath = '.data/billing.json') {
    this.store = new PersistentJsonStore<BillingState>(filePath, () => ({
    products: [
      {
        id: 'product-001',
        code: 'CARE-TERM-001',
        name: '托管 + 作业辅导',
        category: 'care',
        billingMode: 'term',
        priceCents: 380000,
        unit: 'term',
        description: '春季学期托管套餐',
        status: 'active',
        createdAt: '2026-03-20T10:00:00+08:00',
        updatedAt: '2026-03-20T10:00:00+08:00',
      },
    ],
    contracts: [
      {
        id: 'contract-001',
        contractNo: 'CT2026030001',
        campusId: 'campus-001',
        termId: 'term-2026-spring',
        familyId: 'family-001',
        studentId: 'student-001',
        signDate: '2026-03-20',
        startDate: '2026-03-25',
        endDate: '2026-06-30',
        totalAmountCents: 380000,
        discountAmountCents: 20000,
        payableAmountCents: 360000,
        status: 'active',
        remark: '样例合同',
        createdAt: '2026-03-20T10:00:00+08:00',
        updatedAt: '2026-03-20T10:00:00+08:00',
      },
    ],
    contractItems: [
      {
        id: 'contract-item-001',
        contractId: 'contract-001',
        productId: 'product-001',
        itemName: '托管 + 作业辅导',
        unitPriceCents: 380000,
        quantity: 1,
        subtotalCents: 380000,
        createdAt: '2026-03-20T10:00:00+08:00',
      },
    ],
    invoices: [
      {
        id: 'invoice-001',
        invoiceNo: 'IV202603230001',
        contractId: 'contract-001',
        familyId: 'family-001',
        studentId: 'student-001',
        billingPeriod: '2026-S1',
        issueDate: '2026-03-23',
        dueDate: '2026-03-25',
        amountCents: 360000,
        status: 'issued',
        note: '首期账单',
        createdAt: '2026-03-23T09:00:00+08:00',
        updatedAt: '2026-03-23T09:00:00+08:00',
      },
    ],
    invoiceItems: [
      {
        id: 'invoice-item-001',
        invoiceId: 'invoice-001',
        itemName: '托管 + 作业辅导',
        productId: 'product-001',
        quantity: 1,
        unitPriceCents: 360000,
        amountCents: 360000,
        createdAt: '2026-03-23T09:00:00+08:00',
      },
    ],
    payments: [],
    refunds: [],
    renewals: [
      {
        id: 'renewal-001',
        familyId: 'family-001',
        studentId: 'student-001',
        campusId: 'campus-001',
        termId: 'term-2026-spring',
        contractId: 'contract-001',
        ownerUserId: 'user-service-001',
        expectedEndDate: '2026-06-30',
        status: 'todo',
        lastContactAt: null,
        nextFollowUpAt: '2026-06-10T10:00:00+08:00',
        note: '首轮续费跟进',
        createdAt: '2026-03-24T10:00:00+08:00',
        updatedAt: '2026-03-24T10:00:00+08:00',
      },
    ],
  }));
  }

  private get state() { return this.store.get(); }

  listProducts() { return [...this.state.products]; }
  listContracts() { return [...this.state.contracts]; }
  listInvoices() { return [...this.state.invoices]; }
  listPayments() { return [...this.state.payments]; }
  listRefunds() { return [...this.state.refunds]; }
  listRenewals() { return [...this.state.renewals]; }

  findContractById(contractId: string) { return this.state.contracts.find((item) => item.id === contractId); }
  findInvoiceById(invoiceId: string) { return this.state.invoices.find((item) => item.id === invoiceId); }
  findPaymentById(paymentId: string) { return this.state.payments.find((item) => item.id === paymentId); }
  findRefundById(refundId: string) { return this.state.refunds.find((item) => item.id === refundId); }
  findPaymentByIdempotencyKey(idempotencyKey: string) { return this.state.payments.find((item) => item.idempotencyKey === idempotencyKey); }

  getContractOrThrow(contractId: string) {
    const contract = this.findContractById(contractId);
    if (!contract) throw new NotFoundException(`contract ${contractId} not found`);
    return contract;
  }

  getInvoiceOrThrow(invoiceId: string) {
    const invoice = this.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException(`invoice ${invoiceId} not found`);
    return invoice;
  }

  getPaymentOrThrow(paymentId: string) {
    const payment = this.findPaymentById(paymentId);
    if (!payment) throw new NotFoundException(`payment ${paymentId} not found`);
    return payment;
  }

  getRefundOrThrow(refundId: string) {
    const refund = this.findRefundById(refundId);
    if (!refund) throw new NotFoundException(`refund ${refundId} not found`);
    return refund;
  }

  getRenewalOrThrow(renewalId: string) {
    const renewal = this.state.renewals.find((item) => item.id === renewalId);
    if (!renewal) throw new NotFoundException(`renewal ${renewalId} not found`);
    return renewal;
  }

  listContractItems(contractId: string) { return this.state.contractItems.filter((item) => item.contractId === contractId); }
  listInvoiceItems(invoiceId: string) { return this.state.invoiceItems.filter((item) => item.invoiceId === invoiceId); }
  listPaymentsByInvoice(invoiceId: string) { return this.state.payments.filter((item) => item.invoiceId === invoiceId); }
  listRefundsByPayment(paymentId: string) { return this.state.refunds.filter((item) => item.paymentId === paymentId); }

  createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: BillingProduct;
    this.store.update((state) => {
      this.ensureUnique('product code', state.products.some((item) => item.code === input.code));
      const now = new Date().toISOString();
      created = { ...input, id: `product-${String(state.products.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.products.unshift(created);
    });
    return created;
  }

  createContract(input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>) {
    let created!: { contract: BillingContract; items: BillingContractItem[] };
    this.store.update((state) => {
      this.ensureUnique('contractNo', state.contracts.some((item) => item.contractNo === input.contractNo));
      const now = new Date().toISOString();
      const contractId = `contract-${String(state.contracts.length + 1).padStart(3, '0')}`;
      const contract: BillingContract = { ...input, id: contractId, createdAt: now, updatedAt: now };
      const contractItems = items.map((item, index) => ({ ...item, id: `contract-item-${String(state.contractItems.length + index + 1).padStart(3, '0')}`, contractId, createdAt: now } satisfies BillingContractItem));
      state.contracts.unshift(contract);
      state.contractItems.unshift(...contractItems);
      created = { contract, items: contractItems };
    });
    return created;
  }

  createInvoice(input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>, items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>) {
    let created!: { invoice: BillingInvoice; items: BillingInvoiceItem[] };
    this.store.update((state) => {
      this.ensureUnique('invoiceNo', state.invoices.some((item) => item.invoiceNo === input.invoiceNo));
      const now = new Date().toISOString();
      const invoiceId = `invoice-${String(state.invoices.length + 1).padStart(3, '0')}`;
      const invoice: BillingInvoice = { ...input, id: invoiceId, createdAt: now, updatedAt: now };
      const invoiceItems = items.map((item, index) => ({ ...item, id: `invoice-item-${String(state.invoiceItems.length + index + 1).padStart(3, '0')}`, invoiceId, createdAt: now } satisfies BillingInvoiceItem));
      state.invoices.unshift(invoice);
      state.invoiceItems.unshift(...invoiceItems);
      created = { invoice, items: invoiceItems };
    });
    return created;
  }

  createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: BillingPayment;
    this.store.update((state) => {
      this.ensureUnique('paymentNo', state.payments.some((item) => item.paymentNo === input.paymentNo));
      if (input.idempotencyKey) this.ensureUnique('idempotencyKey', state.payments.some((item) => item.idempotencyKey === input.idempotencyKey), 'PAY_409');
      const now = new Date().toISOString();
      created = { ...input, id: `payment-${String(state.payments.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.payments.unshift(created);
    });
    return created;
  }

  createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: BillingRefund;
    this.store.update((state) => {
      this.ensureUnique('refundNo', state.refunds.some((item) => item.refundNo === input.refundNo));
      const now = new Date().toISOString();
      created = { ...input, id: `refund-${String(state.refunds.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.refunds.unshift(created);
    });
    return created;
  }

  updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>) {
    let updated!: BillingInvoice;
    this.store.update((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId);
      if (!invoice) throw new NotFoundException(`invoice ${invoiceId} not found`);
      Object.assign(invoice, patch, { updatedAt: new Date().toISOString() });
      updated = invoice;
    });
    return updated;
  }

  createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: BillingRenewalTask;
    this.store.update((state) => {
      const now = new Date().toISOString();
      created = { ...input, id: `renewal-${String(state.renewals.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.renewals.unshift(created);
    });
    return created;
  }

  updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>) {
    let updated!: BillingRenewalTask;
    this.store.update((state) => {
      const renewal = state.renewals.find((item) => item.id === renewalId);
      if (!renewal) throw new NotFoundException(`renewal ${renewalId} not found`);
      Object.assign(renewal, patch, { updatedAt: new Date().toISOString() });
      updated = renewal;
    });
    return updated;
  }

  runInTransaction<T>(runner: () => T): T {
    const snapshot = this.store.snapshot();
    try {
      return runner();
    } catch (error) {
      this.store.replace(snapshot);
      throw error;
    }
  }

  private ensureUnique(field: string, exists: boolean, errorCode = 'DATA_409') {
    if (exists) throw new ConflictException({ code: errorCode, message: `${field} already exists` });
  }
}
