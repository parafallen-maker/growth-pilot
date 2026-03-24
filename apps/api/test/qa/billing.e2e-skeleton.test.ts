import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-05 收费闭环：product -> contract -> invoice -> payment -> refund skeleton', async (t) => {
  const { billingService } = createQaFixture();

  await t.test('smoke: create product/contract/invoice/payment/refund and refresh invoice status', () => {
    const product = billingService.createProduct({
      code: 'QA-PRODUCT-001',
      name: 'QA 托管套餐',
      category: 'care',
      billingMode: 'term',
      priceCents: 128000,
      unit: 'term',
      description: 'QA billing path',
      status: 'active',
    });

    const contract = billingService.createContract({
      contractNo: 'QA-CT-20260325-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      familyId: 'family-001',
      studentId: 'student-001',
      signDate: '2026-03-25',
      startDate: '2026-03-25',
      endDate: '2026-06-30',
      discountAmountCents: 8000,
      status: 'active',
      remark: 'qa contract',
      items: [{ productId: product.id, itemName: product.name, unitPriceCents: 128000, quantity: 1 }],
    });

    const invoice = billingService.createInvoice({
      invoiceNo: 'QA-IV-20260325-001',
      contractId: contract.id,
      familyId: 'family-001',
      studentId: 'student-001',
      billingPeriod: '2026-S1',
      issueDate: '2026-03-25',
      dueDate: '2026-03-28',
      amountCents: 120000,
      status: 'issued',
      note: 'qa invoice',
      items: [{ itemName: product.name, productId: product.id, quantity: 1, unitPriceCents: 120000, amountCents: 120000 }],
    });

    const payment = billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-001',
      paidAmountCents: 120000,
      paymentTime: '2026-03-25T10:00:00+08:00',
      channel: 'cash',
      transactionNo: 'qa-tx-001',
      status: 'success',
      remark: 'qa pay',
    }, 'qa-payment-key-001');
    const refund = billingService.createRefund(payment.paymentId, {
      refundNo: 'QA-REFUND-001',
      refundAmountCents: 20000,
      refundTime: '2026-03-26T10:00:00+08:00',
      reason: 'qa partial refund',
      status: 'success',
    });
    const refundDetail = billingService.getRefund(refund.refundId);
    const invoiceList = billingService.listInvoices({ pageNo: 1, pageSize: 20, keyword: 'QA-IV-20260325-001' });

    assert.equal(payment.status, 'success');
    assert.equal(refund.status, 'success');
    assert.equal(refundDetail.invoice?.status, 'partial');
    assert.equal(invoiceList.list[0]?.invoiceNo, 'QA-IV-20260325-001');
  });

  await t.test('case-billing-pages-ui', { todo: '接 /billing/products|contracts|invoices|renewals 页面动作链路' }, () => {});
  await t.test('case-cents-vs-yuan', { todo: '补前端显示元、接口传输 cents 与 rounding 边界断言' }, () => {});
  await t.test('case-payment-refund-guardrails', { todo: '补超额支付、超额退款、幂等键重复提交与对账回归' }, () => {});
});
