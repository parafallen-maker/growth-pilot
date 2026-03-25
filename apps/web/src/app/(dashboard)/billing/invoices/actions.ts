'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { billingService } from '@/services/billing-service';

function bounce(params: Record<string, string>) {
  redirect(`/billing/invoices?${new URLSearchParams(params).toString()}`);
}

function parseAmount(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function parseDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const normalized = text.length === 16 ? `${text}:00` : text;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('请输入合法的日期时间');
  }
  return parsed.toISOString();
}

export async function createBillingInvoice(formData: FormData) {
  try {
    const created = await billingService.createInvoice({
      invoiceNo: String(formData.get('invoiceNo') ?? '').trim(),
      contractId: String(formData.get('contractId') ?? '').trim() || undefined,
      familyId: String(formData.get('familyId') ?? '').trim(),
      studentId: String(formData.get('studentId') ?? '').trim(),
      billingPeriod: String(formData.get('billingPeriod') ?? '').trim(),
      issueDate: String(formData.get('issueDate') ?? '').trim(),
      dueDate: String(formData.get('dueDate') ?? '').trim(),
      amountCents: parseAmount(formData.get('amount')),
      status: String(formData.get('status') ?? '').trim() || undefined,
      note: String(formData.get('note') ?? '').trim() || undefined,
      items: [
        {
          itemName: String(formData.get('itemName') ?? '').trim(),
          productId: String(formData.get('productId') ?? '').trim() || undefined,
          quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
          unitPriceCents: parseAmount(formData.get('unitPrice')),
          amountCents: parseAmount(formData.get('itemAmount')),
          remark: String(formData.get('itemRemark') ?? '').trim() || undefined,
        },
      ].filter((item) => item.itemName),
    });

    revalidatePath('/billing/invoices');
    bounce({ invoice: created.invoiceNo ?? created.id });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建账单失败' });
  }
}

export async function createInvoicePayment(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId') ?? '').trim();
  if (!invoiceId) {
    bounce({ error: '请选择账单' });
  }

  try {
    const created = await billingService.createPayment(
      invoiceId,
      {
        paymentNo: String(formData.get('paymentNo') ?? '').trim(),
        paidAmountCents: parseAmount(formData.get('paidAmount')),
        paymentTime: parseDateTime(formData.get('paymentTime')) ?? '',
        channel: String(formData.get('channel') ?? '').trim(),
        transactionNo: String(formData.get('transactionNo') ?? '').trim() || undefined,
        remark: String(formData.get('remark') ?? '').trim() || undefined,
        status: String(formData.get('status') ?? '').trim() || undefined,
      },
      randomUUID(),
    );

    revalidatePath('/billing/invoices');
    bounce({
      payment: created.paymentId,
      paymentStatus: created.status,
      paymentReplayed: created.replayed ? '1' : '0',
    });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '记录支付失败' });
  }
}

export async function createInvoiceRefund(formData: FormData) {
  const paymentId = String(formData.get('paymentId') ?? '').trim();
  if (!paymentId) {
    bounce({ error: '当前没有可退款的支付记录' });
  }

  try {
    const created = await billingService.createRefund(paymentId, {
      refundNo: String(formData.get('refundNo') ?? '').trim(),
      refundAmountCents: parseAmount(formData.get('refundAmount')),
      refundTime: parseDateTime(formData.get('refundTime')) ?? '',
      reason: String(formData.get('reason') ?? '').trim(),
      status: String(formData.get('status') ?? '').trim() || undefined,
    });

    revalidatePath('/billing/invoices');
    bounce({ refund: created.refundId, refundStatus: created.status, payment: paymentId });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建退款失败' });
  }
}
