'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAuthTokens } from '@/lib/auth-session';
import { ApiError, getApiBaseUrl } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';

function bounce(params: Record<string, string>) {
  redirect(`/homework/submissions?${new URLSearchParams(params).toString()}`);
}

async function uploadHomeworkFile(file: File, uploadedBy: string, purpose: string) {
  const auth = await getAuthTokens();
  const form = new FormData();
  form.set('file', file, file.name || 'homework-upload.bin');

  const response = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/files/upload/multipart`, {
    method: 'POST',
    headers: {
      ...(auth.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {}),
      'x-uploaded-by': uploadedBy,
      'x-upload-purpose': purpose,
    },
    body: form,
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? '上传文件失败', response.status, payload?.code, payload?.traceId);
  }
  return payload.data as { id: string; fileName?: string };
}

export async function createHomeworkSubmission(formData: FormData) {
  try {
    const currentUser = await requireCurrentUser();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size <= 0) {
      bounce({ error: '请先选择作业文件' });
    }

    const uploadFile = file as File;
    const uploaded = await uploadHomeworkFile(uploadFile, currentUser.id, 'homework_submission');
    const created = await homeworkService.createSubmission({
      studentId: String(formData.get('studentId') ?? '').trim(),
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      teacherId: String(formData.get('teacherId') ?? '').trim() || undefined,
      subject: String(formData.get('subject') ?? '').trim(),
      homeworkDate: String(formData.get('homeworkDate') ?? '').trim(),
      fileIds: [uploaded.id],
      sourceType: String(formData.get('sourceType') ?? '').trim() || 'manual_upload',
      remark: String(formData.get('remark') ?? '').trim() || undefined,
    });

    revalidatePath('/homework/submissions');
    bounce({ created: created.submissionNo ?? created.id, fileId: uploaded.id });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建作业提交失败' });
  }
}

export async function bulkTriggerHomeworkAnalysis(formData: FormData) {
  const submissionIds = formData.getAll('submissionIds').map((item) => String(item).trim()).filter(Boolean);
  if (!submissionIds.length) {
    bounce({ error: '至少选择 1 条作业记录' });
  }

  try {
    const result = await homeworkService.bulkTriggerAnalysis({
      submissionIds,
      force: ['on', 'true', '1'].includes(String(formData.get('force') ?? '')),
    });

    revalidatePath('/homework/submissions');
    submissionIds.forEach((submissionId) => revalidatePath(`/homework/review/${submissionId}`));
    bounce({ created: `已批量触发 AI：${result.count} 条` });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '批量触发 AI 失败' });
  }
}

export async function bulkApplyHomeworkTags(formData: FormData) {
  const submissionIds = formData.getAll('submissionIds').map((item) => String(item).trim()).filter(Boolean);
  const errorTaxonomyIds = formData.getAll('errorTaxonomyId').map((item) => String(item).trim()).filter(Boolean);
  if (!submissionIds.length) {
    bounce({ error: '至少选择 1 条作业记录' });
  }
  if (!errorTaxonomyIds.length) {
    bounce({ error: '至少选择 1 个错因标签' });
  }

  try {
    const currentUser = await requireCurrentUser();
    const result = await homeworkService.bulkApplyReviewTags({
      submissionIds,
      reviewerTeacherId: currentUser.id,
      finalErrorSummary: String(formData.get('finalErrorSummary') ?? '').trim() || undefined,
      mode: (String(formData.get('mode') ?? 'merge').trim() || 'merge') as 'merge' | 'replace',
      finalErrorItems: errorTaxonomyIds.map((errorTaxonomyId) => ({ errorTaxonomyId, weight: 1 })),
    });

    revalidatePath('/homework/submissions');
    submissionIds.forEach((submissionId) => revalidatePath(`/homework/review/${submissionId}`));
    bounce({ reviewed: `已批量打标签：${result.count} 条` });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '批量打错因标签失败' });
  }
}

export async function submitHomeworkReviewFromList(formData: FormData) {
  const submissionId = String(formData.get('submissionId') ?? '').trim();
  if (!submissionId) {
    bounce({ error: '缺少 submissionId，无法提交复核' });
  }

  try {
    const currentUser = await requireCurrentUser();
    await homeworkService.submitReview(submissionId, {
      reviewResult: (String(formData.get('reviewResult') ?? 'adjusted').trim() || 'adjusted') as 'approved' | 'adjusted' | 'rejected',
      finalAccuracyPct: Number(formData.get('finalAccuracyPct') ?? 0),
      finalErrorSummary: String(formData.get('finalErrorSummary') ?? '').trim() || undefined,
      finalSuggestion: String(formData.get('finalSuggestion') ?? '').trim() || undefined,
      publishToFamily: ['on', 'true', '1'].includes(String(formData.get('publishToFamily') ?? '')),
      reviewerTeacherId: currentUser.id,
      finalErrorItems: formData
        .getAll('errorTaxonomyId')
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map((errorTaxonomyId) => ({ errorTaxonomyId, weight: 1 })),
    });

    revalidatePath('/homework/submissions');
    revalidatePath(`/homework/review/${submissionId}`);
    bounce({ reviewed: submissionId, reviewNonce: randomUUID() });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '提交复核失败' });
  }
}
