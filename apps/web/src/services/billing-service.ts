import type { PageResult, QueryBase } from '@/features/shared/types';

export type BillingFilters = QueryBase & {
  familyId?: string;
  studentId?: string;
  teacherId?: string;
  endDateFrom?: string;
  endDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  tab?: 'invoices' | 'payments' | 'refunds' | 'adjustments';
};

type BillingProductItem = {
  productCode: string;
  name: string;
  billingMode: string;
  unitPriceYuan: string;
  status: string;
};

type ContractItem = {
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

const products: BillingProductItem[] = [
  { productCode: 'COURSE-1V1-24', name: '1V1 私教 24 课时包', billingMode: '按课时', unitPriceYuan: toYuan(128000), status: 'active' },
  { productCode: 'COURSE-SMALL-12', name: '小班课 12 次卡', billingMode: '按次卡', unitPriceYuan: toYuan(69900), status: 'active' },
  { productCode: 'SERVICE-GROWTH', name: '成长顾问服务包', billingMode: '按月', unitPriceYuan: toYuan(9800), status: 'draft' },
];

const contracts: ContractItem[] = [
  { contractNo: 'CT-202603-001', familyName: '张家', studentName: '张小北', effectiveDate: '2026-03-01', expiryDate: '2026-06-30', contractAmountYuan: toYuan(128000), status: 'active', actions: '查看详情 / 创建账单 / 创建续费任务' },
  { contractNo: 'CT-202603-009', familyName: '林家', studentName: '林一诺', effectiveDate: '2026-03-15', expiryDate: '2026-05-31', contractAmountYuan: toYuan(69900), status: 'pending_activation', actions: '查看详情 / 推送签约 / 创建账单' },
  { contractNo: 'CT-202602-018', familyName: '赵家', studentName: '赵安安', effectiveDate: '2026-02-10', expiryDate: '2026-04-10', contractAmountYuan: toYuan(9800), status: 'expiring', actions: '查看详情 / 创建续费任务' },
];

const invoices: InvoiceItem[] = [
  { invoiceNo: 'INV-202603-201', familyName: '张家', studentName: '张小北', receivableYuan: toYuan(64000), dueDate: '2026-03-28', paidYuan: toYuan(32000), status: 'partial_paid', actions: '查看账单 / 记录支付 / 发起退款' },
  { invoiceNo: 'INV-202603-202', familyName: '林家', studentName: '林一诺', receivableYuan: toYuan(69900), dueDate: '2026-03-30', paidYuan: toYuan(0), status: 'issued', actions: '查看账单 / 记录支付' },
  { invoiceNo: 'INV-202603-177', familyName: '赵家', studentName: '赵安安', receivableYuan: toYuan(9800), dueDate: '2026-03-20', paidYuan: toYuan(9800), status: 'paid', actions: '查看账单 / 发起退款 / 添加调整' },
];

const payments: PaymentItem[] = [
  { paymentNo: 'PAY-202603-8801', invoiceNo: 'INV-202603-201', familyName: '张家', studentName: '张小北', paidYuan: toYuan(32000), paidAt: '2026-03-22 18:20', channel: '微信', status: 'posted', actions: '查看支付 / 发起退款' },
  { paymentNo: 'PAY-202603-8802', invoiceNo: 'INV-202603-177', familyName: '赵家', studentName: '赵安安', paidYuan: toYuan(9800), paidAt: '2026-03-18 09:10', channel: '现金', status: 'posted', actions: '查看支付 / 打印回执' },
];

const refunds: RefundItem[] = [
  { refundNo: 'REF-202603-1201', paymentNo: 'PAY-202603-8802', familyName: '赵家', studentName: '赵安安', refundYuan: toYuan(2000), refundAt: '2026-03-21 16:45', status: 'processing', actions: '查看退款 / 继续处理' },
  { refundNo: 'REF-202603-1202', paymentNo: 'PAY-202603-8790', familyName: '陈家', studentName: '陈启元', refundYuan: toYuan(1500), refundAt: '2026-03-19 11:00', status: 'completed', actions: '查看退款 / 导出凭证' },
];

const renewals: RenewalItem[] = [
  { renewalId: 'REN-301', familyName: '张家', studentName: '张小北', contractExpiryDate: '2026-06-30', status: '已建跟进', owner: '李顾问', nextFollowUpAt: '2026-03-27 19:00', actions: '更新跟进 / 新建沟通 / 转创建账单' },
  { renewalId: 'REN-302', familyName: '赵家', studentName: '赵安安', contractExpiryDate: '2026-04-10', status: '待确认意向', owner: '王老师', nextFollowUpAt: '2026-03-25 10:00', actions: '更新跟进 / 新建沟通' },
  { renewalId: 'REN-303', familyName: '林家', studentName: '林一诺', contractExpiryDate: '2026-05-31', status: '等待付款', owner: '财务小组', nextFollowUpAt: '2026-03-29 15:00', actions: '更新跟进 / 转创建账单' },
];

export const billingService = {
  queryProducts(params: QueryBase = {}): PageResult<BillingProductItem> {
    return { list: products, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: products.length } };
  },
  queryContracts(params: BillingFilters = {}): PageResult<ContractItem> {
    return { list: contracts, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: contracts.length } };
  },
  detailContract(contractNo: string) {
    return {
      contractNo,
      summary: [
        { name: '合同主体', detail: '家庭 / 学生 / 校区 占位' },
        { name: '金额口径', detail: '接口 cents -> VO 转元后展示' },
        { name: '生命周期', detail: 'draft -> active -> expiring -> closed' },
      ],
      actions: [
        { name: '创建账单', detail: '保留合同到账单动作位' },
        { name: '创建续费任务', detail: '保留临期转跟进池动作位' },
        { name: '查看支付 / 退款', detail: '保留链路追溯位' },
      ],
    };
  },
  queryInvoices(params: BillingFilters = {}) {
    return {
      filters: params,
      invoices: { list: invoices, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: invoices.length } },
      payments: { list: payments, page: { pageNo: 1, pageSize: 20, total: payments.length } },
      refunds: { list: refunds, page: { pageNo: 1, pageSize: 20, total: refunds.length } },
      adjustments: [
        { title: '学员请假抵扣', detail: 'adj-9001 / -¥200.00 / 待审批' },
        { title: '赠送课时补录', detail: 'adj-9002 / 0 元 / 已生效' },
      ],
    };
  },
  actionInvoice(invoiceNo: string) {
    return {
      invoiceNo,
      actions: ['新建账单', '记录支付', '发起退款', '添加调整'],
      statusFlow: 'issued -> partial_paid -> paid / refunded',
    };
  },
  queryRenewals(params: BillingFilters = {}): PageResult<RenewalItem> {
    return { list: renewals, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: renewals.length } };
  },
};
