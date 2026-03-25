import { apiRequest, type PageResult } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase } from '@/features/shared/types';

export type BillingFilters = QueryBase & {
  familyId?: string;
  studentId?: string;
  teacherId?: string;
  endDateFrom?: string;
  endDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  tab?: 'invoices' | 'payments' | 'refunds' | 'adjustments';
  status?: string;
};

export type CreateContractPayload = {
  contractNo: string;
  campusId?: string;
  termId?: string;
  familyId: string;
  studentId: string;
  signDate: string;
  startDate: string;
  endDate: string;
  discountAmountCents?: number;
  remark?: string;
  status?: string;
  items: Array<{
    productId?: string;
    itemName: string;
    unitPriceCents: number;
    quantity: number;
  }>;
};

export type CreateContractLineItemPayload = CreateContractPayload['items'][number];

export type CreateBillingProductPayload = {
  code: string;
  name: string;
  category: string;
  billingMode: string;
  priceCents: number;
  unit?: string;
  description?: string;
  status?: string;
};

export type CreateInvoicePayload = {
  invoiceNo: string;
  contractId?: string;
  familyId: string;
  studentId: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  amountCents: number;
  status?: string;
  note?: string;
  items?: Array<{
    itemName: string;
    productId?: string;
    quantity?: number;
    unitPriceCents?: number;
    amountCents: number;
    remark?: string;
  }>;
};

export type CreatePaymentPayload = {
  paymentNo: string;
  paidAmountCents: number;
  paymentTime: string;
  channel: string;
  transactionNo?: string;
  remark?: string;
  status?: string;
};

export type CreateRefundPayload = {
  refundNo: string;
  refundAmountCents: number;
  refundTime: string;
  reason: string;
  status?: string;
};

export type CreateRenewalPayload = {
  familyId: string;
  studentId: string;
  campusId?: string;
  termId?: string;
  contractId?: string;
  ownerUserId?: string;
  expectedEndDate?: string;
  status?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  note?: string;
};

type BillingProductItem = {
  productId: string;
  productCode: string;
  name: string;
  billingMode: string;
  unitPriceYuan: string;
  status: string;
};

type ContractItem = {
  contractId: string;
  contractNo: string;
  familyName: string;
  studentName: string;
  effectiveDate: string;
  expiryDate: string;
  contractAmountYuan: string;
  status: string;
  actions: string;
};

type InvoiceItem = {
  invoiceId: string;
  invoiceNo: string;
  familyName: string;
  studentName: string;
  receivableYuan: string;
  dueDate: string;
  paidYuan: string;
  status: string;
  actions: string;
};

type PaymentItem = {
  paymentNo: string;
  invoiceNo: string;
  familyName: string;
  studentName: string;
  paidYuan: string;
  paidAt: string;
  channel: string;
  status: string;
  actions: string;
};

type RefundItem = {
  refundNo: string;
  paymentNo: string;
  familyName: string;
  studentName: string;
  refundYuan: string;
  refundAt: string;
  status: string;
  actions: string;
};

type RenewalItem = {
  renewalId: string;
  familyName: string;
  studentName: string;
  contractExpiryDate: string;
  status: string;
  owner: string;
  nextFollowUpAt: string;
  actions: string;
};

const toYuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
const formatAt = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '--');

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function fetchBillingLookups(auth: Awaited<ReturnType<typeof getAuthTokens>>) {
  const [familiesResult, studentsResult, usersResult] = await Promise.all([
    apiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=200', { auth, retryOn401: Boolean(auth.refreshToken) }),
    apiRequest<PageResult<{ id: string; name: string }>>('/students?pageNo=1&pageSize=200', { auth, retryOn401: Boolean(auth.refreshToken) }),
    apiRequest<PageResult<{ id: string; displayName: string }>>('/users?pageNo=1&pageSize=200', { auth, retryOn401: Boolean(auth.refreshToken) }).catch(() => ({ list: [], page: { pageNo: 1, pageSize: 200, total: 0 } })),
  ]);

  return {
    familyNameById: new Map(familiesResult.list.map((item) => [item.id, item.familyName ?? item.primaryContactName ?? item.familyCode])),
    studentNameById: new Map(studentsResult.list.map((item) => [item.id, item.name])),
    userNameById: new Map(usersResult.list.map((item) => [item.id, item.displayName])),
  };
}

function toLookupName(id: string | null | undefined, lookup: Map<string, string>, empty = '--') {
  return id ? lookup.get(id) ?? id : empty;
}

export const billingService = {
  async queryProducts(params: QueryBase = {}): Promise<PageResult<BillingProductItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<{ id: string; code: string; name: string; billingMode: string; priceCents: number; status: string }>>(`/billing/products${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((item) => ({
        productId: item.id,
        productCode: item.code,
        name: item.name,
        billingMode: item.billingMode,
        unitPriceYuan: toYuan(item.priceCents),
        status: item.status,
      })),
    };
  },

  async createProduct(payload: CreateBillingProductPayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; code: string; name: string }>(`/billing/products`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async queryContracts(params: BillingFilters = {}): Promise<PageResult<ContractItem>> {
    const auth = await getAuthTokens();
    const [result, lookups] = await Promise.all([
      apiRequest<PageResult<{ id: string; contractNo: string; familyId: string; studentId: string; startDate: string; endDate: string; payableAmountCents: number; status: string }>>(`/billing/contracts${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      fetchBillingLookups(auth),
    ]);
    return {
      ...result,
      list: result.list.map((item) => ({
        contractId: item.id,
        contractNo: item.contractNo,
        familyName: toLookupName(item.familyId, lookups.familyNameById),
        studentName: toLookupName(item.studentId, lookups.studentNameById),
        effectiveDate: item.startDate,
        expiryDate: item.endDate,
        contractAmountYuan: toYuan(item.payableAmountCents),
        status: item.status,
        actions: '查看详情 / 创建账单 / 创建续费任务',
      })),
    };
  },

  async detailContract(contractId: string) {
    const auth = await getAuthTokens();
    const [detail, lookups] = await Promise.all([
      apiRequest<{
        contract: { contractNo: string; familyId: string; studentId: string; startDate: string; endDate: string; payableAmountCents: number; status: string };
        items: Array<{ itemName: string; quantity: number; unitPriceCents: number; subtotalCents: number }>;
        invoices: Array<{ invoiceNo: string; status: string; amountCents: number }>;
      }>(`/billing/contracts/${contractId}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      fetchBillingLookups(auth),
    ]);

    return {
      contractNo: detail.contract.contractNo,
      summary: [
        { name: '合同主体', detail: `${toLookupName(detail.contract.familyId, lookups.familyNameById)} / ${toLookupName(detail.contract.studentId, lookups.studentNameById)}` },
        { name: '金额口径', detail: `${toYuan(detail.contract.payableAmountCents)} / cents -> 元展示` },
        { name: '生命周期', detail: `${detail.contract.status} / ${detail.contract.startDate} -> ${detail.contract.endDate}` },
      ],
      actions: [
        { name: '合同明细', detail: detail.items.length ? detail.items.map((item) => `${item.itemName} x${item.quantity} / ${toYuan(item.subtotalCents)}`).join(' / ') : '暂无收费项' },
        { name: '关联账单', detail: detail.invoices.length ? detail.invoices.map((invoice) => `${invoice.invoiceNo} / ${invoice.status} / ${toYuan(invoice.amountCents)}`).join(' / ') : '暂无关联账单' },
        { name: '查看支付 / 退款', detail: '支付与退款详情接口已存在；列表聚合接口仍待补齐。' },
      ],
    };
  },


  async createContract(payload: CreateContractPayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; contractNo: string }>(`/billing/contracts`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async createInvoice(payload: CreateInvoicePayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; invoiceNo: string }>(`/billing/invoices`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async queryInvoices(params: BillingFilters = {}) {
    const { tab: _tab, ...query } = params;
    const auth = await getAuthTokens();
    const [result, lookups] = await Promise.all([
      apiRequest<PageResult<{ id: string; invoiceNo: string; familyId: string; studentId: string; amountCents: number; dueDate: string; status: string }>>(`/billing/invoices${buildQuery(query)}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      fetchBillingLookups(auth),
    ]);
    const invoiceRows: InvoiceItem[] = result.list.map((item) => ({
      invoiceId: item.id,
      invoiceNo: item.invoiceNo,
      familyName: toLookupName(item.familyId, lookups.familyNameById),
      studentName: toLookupName(item.studentId, lookups.studentNameById),
      receivableYuan: toYuan(item.amountCents),
      dueDate: item.dueDate,
      paidYuan: '待 payment/refund 聚合页',
      status: item.status,
      actions: '查看账单 / 记录支付 / 发起退款',
    }));

    return {
      filters: params,
      invoices: { list: invoiceRows, page: result.page },
      payments: { list: [] as PaymentItem[], page: { pageNo: 1, pageSize: 20, total: 0 } },
      refunds: { list: [] as RefundItem[], page: { pageNo: 1, pageSize: 20, total: 0 } },
      adjustments: [{ title: 'billing_adjustments', detail: '后端尚未落地调整项接口，当前明确显示缺口，不伪造数据。' }],
    };
  },


  async createPayment(invoiceId: string, payload: CreatePaymentPayload, idempotencyKey?: string) {
    const auth = await getAuthTokens();
    return apiRequest<{ paymentId: string; status: string; replayed?: boolean }>(`/billing/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: payload,
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async detailPayment(paymentId: string) {
    const auth = await getAuthTokens();
    return apiRequest<{
      payment: { id: string; invoiceId: string; paymentNo: string; paidAmountCents: number; paymentTime: string; channel: string; status: string; transactionNo?: string | null; remark?: string | null };
      invoice: { id: string; invoiceNo: string; familyId: string; studentId: string; amountCents: number; dueDate: string; status: string };
      refunds: Array<{ id: string; refundNo: string; refundAmountCents: number; refundTime: string; reason: string; status: string }>;
    }>(`/billing/payments/${paymentId}`, { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  async createRefund(paymentId: string, payload: CreateRefundPayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ refundId: string; status: string }>(`/billing/payments/${paymentId}/refunds`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async detailRefund(refundId: string) {
    const auth = await getAuthTokens();
    return apiRequest<{
      refund: { id: string; paymentId: string; refundNo: string; refundAmountCents: number; refundTime: string; reason: string; status: string };
      payment: { id: string; paymentNo: string; invoiceId: string; paidAmountCents: number; paymentTime: string; channel: string; status: string } | null;
      invoice: { id: string; invoiceNo: string; familyId: string; studentId: string; amountCents: number; dueDate: string; status: string } | null;
    }>(`/billing/refunds/${refundId}`, { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  actionInvoice(invoiceNo: string) {
    return {
      invoiceNo,
      actions: ['新建账单', '记录支付', '发起退款', '添加调整'],
      statusFlow: 'issued -> partial / paid / refunded',
    };
  },

  async queryRenewals(params: BillingFilters = {}): Promise<PageResult<RenewalItem>> {
    const auth = await getAuthTokens();
    const [result, lookups] = await Promise.all([
      apiRequest<PageResult<{ id: string; familyId: string; studentId: string; expectedEndDate?: string | null; status: string; ownerUserId?: string | null; nextFollowUpAt?: string | null }>>(`/billing/renewals${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      fetchBillingLookups(auth),
    ]);
    return {
      ...result,
      list: result.list.map((item) => ({
        renewalId: item.id,
        familyName: toLookupName(item.familyId, lookups.familyNameById),
        studentName: toLookupName(item.studentId, lookups.studentNameById),
        contractExpiryDate: item.expectedEndDate ?? '--',
        status: item.status,
        owner: toLookupName(item.ownerUserId, lookups.userNameById),
        nextFollowUpAt: formatAt(item.nextFollowUpAt),
        actions: '更新跟进 / 新建沟通 / 转创建账单',
      })),
    };
  },

  async createRenewal(payload: CreateRenewalPayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; status: string }>(`/billing/renewals`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async updateRenewalStatus(renewalId: string, payload: { status: string; lastContactAt?: string; note?: string }) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; status: string }>(`/billing/renewals/${renewalId}/status`, {
      method: 'PATCH',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async updateRenewalFollowUp(renewalId: string, payload: { nextFollowUpAt: string; note?: string }) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; nextFollowUpAt?: string | null }>(`/billing/renewals/${renewalId}/follow-up`, {
      method: 'PATCH',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },
};
