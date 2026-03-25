import { homeworkReviewDefaultValues } from '@/features/homework/schema';

export const homeworkReviewDraftStore = {
  draftKey: (submissionId: string) => `homework-review-draft:${submissionId}`,
  getInitialDraft(submissionId: string) {
    return {
      submissionId,
      values: homeworkReviewDefaultValues,
      dirty: true,
      lastSavedAt: '2026-03-24 19:40',
      warning: '切换 submission 时需弹未保存提醒；当前先保留提醒文案，后续再接入更完整的离页保护。',
    };
  },
};
