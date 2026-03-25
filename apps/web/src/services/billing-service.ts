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

export type CreatePaymentPayload = {
  paymentNo: string;
  paidAmountCents: number;
  paymentTime: string;
  channel: string;
  transactionNo?: string;
  remark?: string;
  status?: string;
};

type BillingProductItem = {
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

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const billingService = {
  async queryProducts(params: QueryBase = {}): Promise<PageResult<BillingProductItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<{ code: string; name: string; billingMode: string; priceCents: number; status: string }>>(`/billing/products${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((item) => ({
        productCode: item.code,
        name: item.name,
        billingMode: item.billingMode,
        unitPriceYuan: toYuan(item.priceCents),
        status: item.status,
      })),
    };
  },

  async queryContracts(params: BillingFilters = {}): Promise<PageResult<ContractItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<{ id: string; contractNo: string; familyId: string; studentId: string; startDate: string; endDate: string; payableAmountCents: number; status: string }>>(`/billing/contracts${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((item) => ({
        contractId: item.id,
        contractNo: item.contractNo,
        familyName: item.familyId,
        studentName: item.studentId,
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
    const detail = await apiRequest<{
      contract: { contractNo: string; familyId: string; studentId: string; startDate: string; endDate: string; payableAmountCents: number; status: string };
      items: Array<{ itemName: string; quantity: number; unitPriceCents: number; subtotalCents: number }>;
      invoices: Array<{ invoiceNo: string; status: string; amountCents: number }>;
    }>(`/billing/contracts/${contractId}`, { auth, retryOn401: Boolean(auth.refreshToken) });

    return {
      contractNo: detail.contract.contractNo,
      summary: [
        { name: '合同主体', detail: `${detail.contract.familyId} / ${detail.contract.studentId}` },
        { name: '金额口径', detail: `${toYuan(detail.contract.payableAmountCents)} / cents -> 元展示` },
        { name: '生命周期', detail: `${detail.contract.status} / ${detail.contract.startDate} -> ${detail.contract.endDate}` },
      ],
      actions: [
        { name: '合同明细', detail: `${detail.items.length} 条收费项` },
        { name: '关联账单', detail: `${detail.invoices.length} 张` },
        { name: '查看支付 / 退款', detail: '支付与退款详情接口已存在。' },
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

  async queryInvoices(params: BillingFilters = {}) {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<{ id: string; invoiceNo: string; familyId: string; studentId: string; amountCents: number; dueDate: string; status: string }>>(`/billing/invoices${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    const invoiceRows: InvoiceItem[] = result.list.map((item) => ({
      invoiceId: item.id,
      invoiceNo: item.invoiceNo,
      familyName: item.familyId,
      studentName: item.studentId,
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
    return apiRequest<{ id: string; paymentNo: string }>(`/billing/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: payload,
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
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
    const result = await apiRequest<PageResult<{ id: string; familyId: string; studentId: string; expectedEndDate?: string | null; status: string; ownerUserId?: string | null; nextFollowUpAt?: string | null }>>(`/billing/renewals${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((item) => ({
        renewalId: item.id,
        familyName: item.familyId,
        studentName: item.studentId,
        contractExpiryDate: item.expectedEndDate ?? '--',
        status: item.status,
        owner: item.ownerUserId ?? '--',
        nextFollowUpAt: item.nextFollowUpAt ?? '--',
        actions: '更新跟进 / 新建沟通 / 转创建账单',
      })),
    };
  },
};
