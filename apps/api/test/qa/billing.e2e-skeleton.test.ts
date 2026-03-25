import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('QA-04 账单收款链：product -> contract -> invoice -> payment -> refund -> status executable', async (t) => {
  const { billingService } = createQaFixture();

  await t.test('smoke: create product/contract/invoice/payment/refund and refresh invoice status', async () => {
    const product = await billingService.createProduct({
      code: 'QA-PRODUCT-001',
      name: 'QA 托管套餐',
      category: 'care',
      billingMode: 'term',
      priceCents: 128000,
      unit: 'term',
      description: 'QA billing path',
      status: 'active',
    });

    const contract = await billingService.createContract({
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

    const invoice = await billingService.createInvoice({
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

    const payment = await billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-001',
      paidAmountCents: 120000,
      paymentTime: '2026-03-25T10:00:00+08:00',
      channel: 'cash',
      transactionNo: 'qa-tx-001',
      status: 'success',
      remark: 'qa pay',
    }, 'qa-payment-key-001');
    const refund = await billingService.createRefund(payment.paymentId, {
      refundNo: 'QA-REFUND-001',
      refundAmountCents: 20000,
      refundTime: '2026-03-26T10:00:00+08:00',
      reason: 'qa partial refund',
      status: 'success',
    });
    const refundDetail = await billingService.getRefund(refund.refundId);
    const invoiceList = await billingService.listInvoices({ pageNo: 1, pageSize: 20, keyword: 'QA-IV-20260325-001' });

    assert.equal(payment.status, 'success');
    assert.equal(refund.status, 'success');
    assert.equal(refundDetail.invoice?.status, 'partial');
    assert.equal(invoiceList.list[0]?.invoiceNo, 'QA-IV-20260325-001');
  });

  await t.test('case-idempotency-key-replays-payment-without-duplicating', async () => {
    const product = await billingService.createProduct({
      code: 'QA-PRODUCT-002',
      name: 'QA 托管套餐 2',
      category: 'care',
      billingMode: 'term',
      priceCents: 88000,
      unit: 'term',
    });
    const contract = await billingService.createContract({
      contractNo: 'QA-CT-20260325-002',
      familyId: 'family-001',
      studentId: 'student-001',
      signDate: '2026-03-25',
      startDate: '2026-03-25',
      endDate: '2026-06-30',
      items: [{ productId: product.id, itemName: product.name, unitPriceCents: 88000, quantity: 1 }],
    });
    const invoice = await billingService.createInvoice({
      invoiceNo: 'QA-IV-20260325-002',
      contractId: contract.id,
      familyId: 'family-001',
      studentId: 'student-001',
      billingPeriod: '2026-S1',
      issueDate: '2026-03-25',
      dueDate: '2026-03-28',
      amountCents: 88000,
      status: 'issued',
    });

    const firstPayment = await billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-002',
      paidAmountCents: 88000,
      paymentTime: '2026-03-25T11:00:00+08:00',
      channel: 'cash',
      status: 'success',
    }, 'qa-payment-key-002');
    const replayPayment = await billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-002-DUP',
      paidAmountCents: 88000,
      paymentTime: '2026-03-25T11:01:00+08:00',
      channel: 'cash',
      status: 'success',
    }, 'qa-payment-key-002');

    assert.equal(firstPayment.paymentId, replayPayment.paymentId);
    assert.equal(replayPayment.replayed, true);
    assert.equal((await billingService.getPayment(firstPayment.paymentId)).invoice.status, 'paid');
  });

  await t.test('case-payment-refund-guardrails', async () => {
    const product = await billingService.createProduct({
      code: 'QA-PRODUCT-003',
      name: 'QA 托管套餐 3',
      category: 'care',
      billingMode: 'term',
      priceCents: 100000,
      unit: 'term',
    });
    const contract = await billingService.createContract({
      contractNo: 'QA-CT-20260325-003',
      familyId: 'family-001',
      studentId: 'student-001',
      signDate: '2026-03-25',
      startDate: '2026-03-25',
      endDate: '2026-06-30',
      items: [{ productId: product.id, itemName: product.name, unitPriceCents: 100000, quantity: 1 }],
    });
    const invoice = await billingService.createInvoice({
      invoiceNo: 'QA-IV-20260325-003',
      contractId: contract.id,
      familyId: 'family-001',
      studentId: 'student-001',
      billingPeriod: '2026-S1',
      issueDate: '2026-03-25',
      dueDate: '2026-03-28',
      amountCents: 100000,
      status: 'issued',
    });

    await assert.rejects(() => billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-003',
      paidAmountCents: 100001,
      paymentTime: '2026-03-25T12:00:00+08:00',
      channel: 'cash',
      status: 'success',
    }), /payment exceeds invoice receivable/i);

    const payment = await billingService.createPayment(invoice.id, {
      paymentNo: 'QA-PAY-003-OK',
      paidAmountCents: 100000,
      paymentTime: '2026-03-25T12:05:00+08:00',
      channel: 'cash',
      status: 'success',
    });

    await assert.rejects(() => billingService.createRefund(payment.paymentId, {
      refundNo: 'QA-REFUND-003',
      refundAmountCents: 100001,
      refundTime: '2026-03-26T12:00:00+08:00',
      status: 'success',
    }), /refund exceeds payment amount/i);
  });
});
