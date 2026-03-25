'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { billingService } from '@/services/billing-service';

function bounce(params: Record<string, string>) {
  redirect(`/billing/renewals?${new URLSearchParams(params).toString()}`);
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

export async function createBillingRenewal(formData: FormData) {
  try {
    const created = await billingService.createRenewal({
      familyId: String(formData.get('familyId') ?? '').trim(),
      studentId: String(formData.get('studentId') ?? '').trim(),
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      contractId: String(formData.get('contractId') ?? '').trim() || undefined,
      ownerUserId: String(formData.get('ownerUserId') ?? '').trim() || undefined,
      expectedEndDate: String(formData.get('expectedEndDate') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
      lastContactAt: parseDateTime(formData.get('lastContactAt')),
      nextFollowUpAt: parseDateTime(formData.get('nextFollowUpAt')),
      note: String(formData.get('note') ?? '').trim() || undefined,
    });

    revalidatePath('/billing/renewals');
    bounce({ created: created.id, status: created.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建续费任务失败' });
  }
}

export async function updateBillingRenewalStatus(formData: FormData) {
  const renewalId = String(formData.get('renewalId') ?? '').trim();
  if (!renewalId) {
    bounce({ error: '请选择续费任务' });
  }

  try {
    const updated = await billingService.updateRenewalStatus(renewalId, {
      status: String(formData.get('status') ?? '').trim(),
      lastContactAt: parseDateTime(formData.get('lastContactAt')),
      note: String(formData.get('note') ?? '').trim() || undefined,
    });

    revalidatePath('/billing/renewals');
    bounce({ statusUpdated: updated.id, status: updated.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '更新续费状态失败' });
  }
}

export async function updateBillingRenewalFollowUp(formData: FormData) {
  const renewalId = String(formData.get('renewalId') ?? '').trim();
  if (!renewalId) {
    bounce({ error: '请选择续费任务' });
  }

  try {
    const updated = await billingService.updateRenewalFollowUp(renewalId, {
      nextFollowUpAt: parseDateTime(formData.get('nextFollowUpAt')) ?? '',
      note: String(formData.get('note') ?? '').trim() || undefined,
    });

    revalidatePath('/billing/renewals');
    bounce({ followUpUpdated: updated.id, nextFollowUpAt: updated.nextFollowUpAt ?? '' });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '更新下次跟进失败' });
  }
}
