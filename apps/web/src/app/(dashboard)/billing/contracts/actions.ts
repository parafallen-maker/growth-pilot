'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { billingService } from '@/services/billing-service';

function bounce(params: Record<string, string>) {
  redirect(`/billing/contracts?${new URLSearchParams(params).toString()}`);
}

function parseAmount(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function parseIntValue(value: FormDataEntryValue | null, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function createBillingContract(formData: FormData) {
  try {
    const created = await billingService.createContract({
      contractNo: String(formData.get('contractNo') ?? '').trim(),
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      familyId: String(formData.get('familyId') ?? '').trim(),
      studentId: String(formData.get('studentId') ?? '').trim(),
      signDate: String(formData.get('signDate') ?? '').trim(),
      startDate: String(formData.get('startDate') ?? '').trim(),
      endDate: String(formData.get('endDate') ?? '').trim(),
      discountAmountCents: parseAmount(formData.get('discountAmount')),
      remark: String(formData.get('remark') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
      items: [{
        productId: String(formData.get('productId') ?? '').trim() || undefined,
        itemName: String(formData.get('itemName') ?? '').trim(),
        unitPriceCents: parseAmount(formData.get('unitPrice')),
        quantity: parseIntValue(formData.get('quantity')),
      }],
    });

    revalidatePath('/billing/contracts');
    bounce({ created: created.contractNo ?? created.id });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建合同失败' });
  }
}
