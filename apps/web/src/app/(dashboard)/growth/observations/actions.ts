'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { growthService } from '@/services/growth-service';

function bounce(params: Record<string, string>) {
  redirect(`/growth/observations?${new URLSearchParams(params).toString()}`);
}

function parseBoolean(value: FormDataEntryValue | null) {
  return ['on', 'true', '1'].includes(String(value ?? ''));
}

function parseScore(formData: FormData, dimensionId: string) {
  const value = Number(formData.get(`score:${dimensionId}`) ?? '');
  return Number.isFinite(value) ? value : 0;
}

export async function createGrowthObservation(formData: FormData) {
  try {
    const templateId = String(formData.get('templateId') ?? '').trim();
    const dimensionIds = formData.getAll('dimensionId').map((value) => String(value)).filter(Boolean);
    if (!templateId || !dimensionIds.length) {
      bounce({ error: '缺少 rubric 维度，当前无法创建观察' });
    }

    const created = await growthService.createObservationEntry({
      studentId: String(formData.get('studentId') ?? '').trim(),
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      teacherId: String(formData.get('teacherId') ?? '').trim() || undefined,
      templateId,
      observationDate: String(formData.get('observationDate') ?? '').trim(),
      scene: String(formData.get('scene') ?? '').trim(),
      strengths: String(formData.get('strengths') ?? '').trim() || undefined,
      improvementNotes: String(formData.get('improvementNotes') ?? '').trim() || undefined,
      publishToFamily: parseBoolean(formData.get('publishToFamily')),
      scores: dimensionIds.map((dimensionId) => ({
        dimensionId,
        score: parseScore(formData, dimensionId),
        note: String(formData.get(`note:${dimensionId}`) ?? '').trim() || undefined,
      })),
    });

    revalidatePath('/growth/observations');
    bounce({ created: created.id });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建成长观察失败' });
  }
}
