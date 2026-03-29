'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { homeworkService, type ErrorTaxonomyStatus } from '@/services/homework-service';

function bounce(params: Record<string, string>): never {
  redirect(`/homework/error-taxonomies?${new URLSearchParams(params).toString()}`);
}

function parseSortOrder(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePayload(formData: FormData) {
  const subjectScope = String(formData.get('subjectScope') ?? '').trim();
  const stageScope = String(formData.get('stageScope') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();

  return {
    code: String(formData.get('code') ?? '').trim(),
    name: String(formData.get('name') ?? '').trim(),
    category: category || stageScope || undefined,
    subjectScope: subjectScope || undefined,
    stageScope: stageScope || category || undefined,
    status: (String(formData.get('status') ?? 'active').trim() || 'active') as ErrorTaxonomyStatus,
    sortOrder: parseSortOrder(formData.get('sortOrder')),
  };
}

export async function createErrorTaxonomy(formData: FormData) {
  try {
    const payload = parsePayload(formData);
    if (!payload.code || !payload.name) {
      bounce({ error: '错因编码和名称必填' });
    }

    const created = await homeworkService.createTaxonomy(payload);
    revalidatePath('/homework/error-taxonomies');
    bounce({ created: created.code ?? created.id });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    bounce({ error: error instanceof Error ? error.message : '创建错因失败' });
  }
}

export async function updateErrorTaxonomy(formData: FormData) {
  const taxonomyId = String(formData.get('taxonomyId') ?? '').trim();
  if (!taxonomyId) {
    bounce({ error: '缺少 taxonomyId' });
  }

  try {
    const payload = parsePayload(formData);
    if (!payload.code || !payload.name) {
      bounce({ error: '错因编码和名称必填' });
    }

    const updated = await homeworkService.updateTaxonomy(taxonomyId, payload);
    revalidatePath('/homework/error-taxonomies');
    bounce({ updated: updated.code ?? updated.id, taxonomyId });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    bounce({ error: error instanceof Error ? error.message : '更新错因失败', taxonomyId });
  }
}
