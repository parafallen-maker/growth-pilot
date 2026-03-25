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
        paymentTime: String(formData.get('paymentTime') ?? '').trim(),
        channel: String(formData.get('channel') ?? '').trim(),
        transactionNo: String(formData.get('transactionNo') ?? '').trim() || undefined,
        remark: String(formData.get('remark') ?? '').trim() || undefined,
        status: String(formData.get('status') ?? '').trim() || undefined,
      },
      randomUUID(),
    );

    revalidatePath('/billing/invoices');
    bounce({
      paid: created.paymentId,
      status: created.status,
      replayed: created.replayed ? '1' : '0',
    });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '记录支付失败' });
  }
}
