'use server';

import { revalidatePath } from 'next/cache';
import { alertsService } from '@/services/alerts-service';

export async function advanceAlert(formData: FormData) {
  const alertId = String(formData.get('alertId') ?? '').trim();
  const nextStatus = String(formData.get('nextStatus') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim() || undefined;
  const resolverUserId = String(formData.get('resolverUserId') ?? '').trim() || undefined;

  if (!alertId || !nextStatus) {
    throw new Error('预警参数缺失');
  }

  await alertsService.update(alertId, {
    status: nextStatus as 'acknowledged' | 'resolved',
    content,
    resolverUserId,
    resolvedAt: nextStatus === 'resolved' ? new Date().toISOString() : undefined,
  });

  revalidatePath('/alerts');
  revalidatePath('/dashboard');
}
