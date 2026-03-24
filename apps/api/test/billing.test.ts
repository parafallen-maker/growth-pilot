import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BillingRepository } from '../src/modules/billing/repository/billing.repository';
import { BillingService } from '../src/modules/billing/service/billing.service';

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'growthpilot-billing-'));
  const repository = new BillingRepository(join(dir, 'billing.json'));
  const service = new BillingService(repository);
  return { repository, service };
}

test('billing product / contract / invoice / payment / refund skeleton flows work', () => {
  const { service } = createFixture();

  const products = service.listProducts({ pageNo: 1, pageSize: 20, status: 'active' });
  assert.equal(products.page.total, 1);

  const product = service.createProduct({
    code: 'HW-MONTH-001',
    name: '晚托月包',
    category: 'homework',
    billingMode: 'monthly',
    priceCents: 120000,
    unit: 'month',
  });
  assert.equal(product.code, 'HW-MONTH-001');

  const contract = service.createContract({
    contractNo: 'CT2026030002',
    campusId: 'campus-001',
    familyId: 'family-001',
    studentId: 'student-001',
    signDate: '2026-03-24',
    startDate: '2026-03-25',
    endDate: '2026-06-30',
    discountAmountCents: 10000,
    items: [
      {
        productId: product.id,
        itemName: product.name,
        unitPriceCents: product.priceCents,
        quantity: 2,
      },
    ],
  });
  assert.equal(contract.contractNo, 'CT2026030002');

  const contractDetail = service.getContract(contract.id);
  assert.equal(contractDetail.items.length, 1);
  assert.equal(contractDetail.contract.payableAmountCents, 230000);

  const invoice = service.createInvoice({
    invoiceNo: 'IV202603240001',
    contractId: contract.id,
    familyId: 'family-001',
    studentId: 'student-001',
    billingPeriod: '2026-04',
    issueDate: '2026-03-24',
    dueDate: '2026-03-31',
    amountCents: 230000,
    status: 'issued',
    items: [
      {
        itemName: '晚托月包',
        productId: product.id,
        quantity: 2,
        unitPriceCents: 120000,
        amountCents: 230000,
      },
    ],
  });
  assert.equal(invoice.invoiceNo, 'IV202603240001');

  const payment = service.createPayment(
    invoice.id,
    {
      paymentNo: 'PM202603240001',
      paidAmountCents: 200000,
      paymentTime: '2026-03-24T10:00:00+08:00',
      channel: 'wechat',
      transactionNo: 'wx_001',
    },
    'idem-pay-001',
  );
  assert.equal(payment.status, 'success');

  const paymentReplay = service.createPayment(
    invoice.id,
    {
      paymentNo: 'PM202603240099',
      paidAmountCents: 200000,
      paymentTime: '2026-03-24T10:00:00+08:00',
      channel: 'wechat',
    },
    'idem-pay-001',
  );
  assert.equal(paymentReplay.paymentId, payment.paymentId);
  assert.equal(paymentReplay.replayed, true);

  const paymentDetail = service.getPayment(payment.paymentId);
  assert.equal(paymentDetail.invoice.status, 'partial');

  const refund = service.createRefund(payment.paymentId, {
    refundNo: 'RF202603240001',
    refundAmountCents: 50000,
    refundTime: '2026-03-24T12:00:00+08:00',
    reason: '家长申请改套餐',
  });
  assert.equal(refund.status, 'success');

  const refundDetail = service.getRefund(refund.refundId);
  assert.equal(refundDetail.payment?.id, payment.paymentId);
  assert.equal(refundDetail.invoice?.status, 'partial');
});

test('billing payment/refund constraints are enforced in memory', () => {
  const { service } = createFixture();

  const invoice = service.createInvoice({
    invoiceNo: 'IV202603240002',
    familyId: 'family-002',
    studentId: 'student-002',
    issueDate: '2026-03-24',
    amountCents: 100000,
    status: 'issued',
  });

  const payment = service.createPayment(invoice.id, {
    paymentNo: 'PM202603240002',
    paidAmountCents: 100000,
    paymentTime: '2026-03-24T10:00:00+08:00',
    channel: 'wechat',
  });

  assert.throws(() => service.createPayment(invoice.id, {
    paymentNo: 'PM202603240002',
    paidAmountCents: 1,
    paymentTime: '2026-03-24T10:01:00+08:00',
    channel: 'cash',
  }));

  service.createInvoice({
    invoiceNo: 'IV202603240003',
    familyId: 'family-002',
    studentId: 'student-002',
    issueDate: '2026-03-24',
    amountCents: 50000,
    status: 'issued',
  });

  service.createPayment(invoice.id, {
    paymentNo: 'PM202603240003',
    paidAmountCents: 0,
    paymentTime: '2026-03-24T10:02:00+08:00',
    channel: 'cash',
  }, 'idem-pay-dup');

  const replayed = service.createPayment(invoice.id, {
    paymentNo: 'PM202603240004',
    paidAmountCents: 1,
    paymentTime: '2026-03-24T10:03:00+08:00',
    channel: 'cash',
  }, 'idem-pay-dup');
  assert.equal(replayed.replayed, true);

  assert.throws(() => service.createRefund(payment.paymentId, {
    refundNo: 'RF202603240002',
    refundAmountCents: 100001,
    refundTime: '2026-03-24T12:00:00+08:00',
  }));

  service.createRefund(payment.paymentId, {
    refundNo: 'RF202603240003',
    refundAmountCents: 100000,
    refundTime: '2026-03-24T12:00:00+08:00',
  });

  assert.throws(() => service.createRefund(payment.paymentId, {
    refundNo: 'RF202603240003',
    refundAmountCents: 1,
    refundTime: '2026-03-24T12:10:00+08:00',
  }));
});
