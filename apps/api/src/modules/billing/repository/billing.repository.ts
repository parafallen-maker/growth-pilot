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
  private state: BillingState = {
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
  };

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

  listContractItems(contractId: string) {
    return this.state.contractItems.filter((item) => item.contractId === contractId);
  }

  listInvoiceItems(invoiceId: string) {
    return this.state.invoiceItems.filter((item) => item.invoiceId === invoiceId);
  }

  listPaymentsByInvoice(invoiceId: string) {
    return this.state.payments.filter((item) => item.invoiceId === invoiceId);
  }

  listRefundsByPayment(paymentId: string) {
    return this.state.refunds.filter((item) => item.paymentId === paymentId);
  }

  createProduct(input: Omit<BillingProduct, 'id' | 'createdAt' | 'updatedAt'>) {
    this.ensureUnique('product code', this.state.products.some((item) => item.code === input.code));
    const now = new Date().toISOString();
    const product: BillingProduct = {
      ...input,
      id: `product-${String(this.state.products.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.products.unshift(product);
    return product;
  }

  createContract(
    input: Omit<BillingContract, 'id' | 'createdAt' | 'updatedAt'>,
    items: Array<Omit<BillingContractItem, 'id' | 'contractId' | 'createdAt'>>,
  ) {
    this.ensureUnique('contractNo', this.state.contracts.some((item) => item.contractNo === input.contractNo));
    const now = new Date().toISOString();
    const contractId = `contract-${String(this.state.contracts.length + 1).padStart(3, '0')}`;
    const contract: BillingContract = { ...input, id: contractId, createdAt: now, updatedAt: now };
    const contractItems = items.map((item, index) => ({
      ...item,
      id: `contract-item-${String(this.state.contractItems.length + index + 1).padStart(3, '0')}`,
      contractId,
      createdAt: now,
    } satisfies BillingContractItem));
    this.state.contracts.unshift(contract);
    this.state.contractItems.unshift(...contractItems);
    return { contract, items: contractItems };
  }

  createInvoice(
    input: Omit<BillingInvoice, 'id' | 'createdAt' | 'updatedAt'>,
    items: Array<Omit<BillingInvoiceItem, 'id' | 'invoiceId' | 'createdAt'>>,
  ) {
    this.ensureUnique('invoiceNo', this.state.invoices.some((item) => item.invoiceNo === input.invoiceNo));
    const now = new Date().toISOString();
    const invoiceId = `invoice-${String(this.state.invoices.length + 1).padStart(3, '0')}`;
    const invoice: BillingInvoice = { ...input, id: invoiceId, createdAt: now, updatedAt: now };
    const invoiceItems = items.map((item, index) => ({
      ...item,
      id: `invoice-item-${String(this.state.invoiceItems.length + index + 1).padStart(3, '0')}`,
      invoiceId,
      createdAt: now,
    } satisfies BillingInvoiceItem));
    this.state.invoices.unshift(invoice);
    this.state.invoiceItems.unshift(...invoiceItems);
    return { invoice, items: invoiceItems };
  }

  createPayment(input: Omit<BillingPayment, 'id' | 'createdAt' | 'updatedAt'>) {
    this.ensureUnique('paymentNo', this.state.payments.some((item) => item.paymentNo === input.paymentNo));
    if (input.idempotencyKey) {
      this.ensureUnique(
        'idempotencyKey',
        this.state.payments.some((item) => item.idempotencyKey === input.idempotencyKey),
        'PAY_409',
      );
    }
    const now = new Date().toISOString();
    const payment: BillingPayment = {
      ...input,
      id: `payment-${String(this.state.payments.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.payments.unshift(payment);
    return payment;
  }

  createRefund(input: Omit<BillingRefund, 'id' | 'createdAt' | 'updatedAt'>) {
    this.ensureUnique('refundNo', this.state.refunds.some((item) => item.refundNo === input.refundNo));
    const now = new Date().toISOString();
    const refund: BillingRefund = {
      ...input,
      id: `refund-${String(this.state.refunds.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.refunds.unshift(refund);
    return refund;
  }

  updateInvoice(invoiceId: string, patch: Partial<BillingInvoice>) {
    const invoice = this.getInvoiceOrThrow(invoiceId);
    Object.assign(invoice, patch, { updatedAt: new Date().toISOString() });
    return invoice;
  }

  createRenewal(input: Omit<BillingRenewalTask, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const renewal: BillingRenewalTask = {
      ...input,
      id: `renewal-${String(this.state.renewals.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.renewals.unshift(renewal);
    return renewal;
  }

  updateRenewal(renewalId: string, patch: Partial<BillingRenewalTask>) {
    const renewal = this.getRenewalOrThrow(renewalId);
    Object.assign(renewal, patch, { updatedAt: new Date().toISOString() });
    return renewal;
  }

  runInTransaction<T>(runner: () => T): T {
    const snapshot: BillingState = JSON.parse(JSON.stringify(this.state));
    try {
      return runner();
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }

  private ensureUnique(field: string, exists: boolean, errorCode = 'DATA_409') {
    if (exists) {
      throw new ConflictException({ code: errorCode, message: `${field} already exists` });
    }
  }
}
