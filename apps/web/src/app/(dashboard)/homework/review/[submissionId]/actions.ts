'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService, type HomeworkReviewDraftPayload, type HomeworkReviewSubmitPayload } from '@/services/homework-service';

function parseBoolean(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === '1';
}

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseReviewPayload(formData: FormData, reviewerTeacherId: string): HomeworkReviewDraftPayload {
  const errorCodes = formData.getAll('errorTaxonomyId').map((value) => String(value)).filter(Boolean);
  const errorRemark = String(formData.get('finalErrorSummary') ?? '').trim();

  return {
    reviewResult: (formData.get('reviewResult') || undefined) as HomeworkReviewDraftPayload['reviewResult'],
    finalAccuracyPct: parseNumber(formData.get('finalAccuracyPct')),
    finalErrorItems: errorCodes.map((errorTaxonomyId) => ({
      errorTaxonomyId,
      note: errorRemark || undefined,
      weight: 1,
    })),
    finalErrorSummary: errorRemark || undefined,
    finalSuggestion: String(formData.get('finalSuggestion') ?? '').trim() || undefined,
    publishToFamily: parseBoolean(formData.get('publishToFamily')),
    reviewerTeacherId,
  };
}

function bounce(submissionId: string, key: 'saved' | 'submitted' | 'error', value: string) {
  const qs = new URLSearchParams({ [key]: value });
  redirect(`/homework/review/${submissionId}?${qs.toString()}`);
}

export async function saveHomeworkReviewDraft(submissionId: string, formData: FormData) {
  const currentUser = await requireCurrentUser();

  try {
    const payload = parseReviewPayload(formData, currentUser.id);
    await homeworkService.saveReviewDraft(submissionId, payload);
    revalidatePath(`/homework/review/${submissionId}`);
    revalidatePath('/homework/submissions');
    bounce(submissionId, 'saved', '1');
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存草稿失败';
    bounce(submissionId, 'error', message);
  }
}

export async function submitHomeworkReview(submissionId: string, formData: FormData) {
  const currentUser = await requireCurrentUser();

  try {
    const base = parseReviewPayload(formData, currentUser.id);
    const payload: HomeworkReviewSubmitPayload = {
      ...base,
      reviewResult: (base.reviewResult ?? 'adjusted') as HomeworkReviewSubmitPayload['reviewResult'],
    };
    await homeworkService.submitReview(submissionId, payload);
    revalidatePath(`/homework/review/${submissionId}`);
    revalidatePath('/homework/submissions');
    bounce(submissionId, 'submitted', '1');
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交正式复核失败';
    bounce(submissionId, 'error', message);
  }
}

export async function triggerHomeworkAnalysis(submissionId: string) {
  try {
    const created = await homeworkService.triggerAnalysis(submissionId, {
      force: true,
      promptVersion: 'homework-review-v3',
    });
    revalidatePath(`/homework/review/${submissionId}`);
    revalidatePath('/homework/submissions');
    bounce(submissionId, 'saved', `analysis:${created.status}:${created.jobId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '触发 AI 分析失败';
    bounce(submissionId, 'error', message);
  }
}
