'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { billingService } from '@/services/billing-service';

function bounce(params: Record<string, string>) {
  redirect(`/billing/products?${new URLSearchParams(params).toString()}`);
}

function parseAmount(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export async function createBillingProduct(formData: FormData) {
  try {
    const created = await billingService.createProduct({
      code: String(formData.get('code') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      category: String(formData.get('category') ?? '').trim(),
      billingMode: String(formData.get('billingMode') ?? '').trim(),
      priceCents: parseAmount(formData.get('price')),
      unit: String(formData.get('unit') ?? '').trim() || undefined,
      description: String(formData.get('description') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
    });

    revalidatePath('/billing/products');
    bounce({ created: created.code ?? created.id });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建收费产品失败' });
  }
}
