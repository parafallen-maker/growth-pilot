import { serverApiRequest } from '@/lib/server-api';
import type { PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';

export type HomeworkSubmissionItem = {
  submissionId: string;
  submissionNo: string;
  studentName: string;
  subject: string;
  submittedAt: string;
  aiStatus: string;
  finalAccuracy: string;
  reviewStatus: string;
  teacherName: string;
  actions: string;
};

export type HomeworkSubmissionQuery = QueryBase & {
  subject?: string;
  teacherId?: string;
  aiStatus?: string;
  reviewStatus?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ErrorTaxonomyItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  subjects: string;
  enabled: string;
  sort: string;
  actions: string;
};

export type ErrorTaxonomyStatus = 'draft' | 'active' | 'inactive';

export type ErrorTaxonomyFormPayload = {
  code: string;
  name: string;
  category?: string;
  subjectScope?: string;
  stageScope?: string;
  status?: ErrorTaxonomyStatus;
  sortOrder?: number;
};

export type CreateHomeworkSubmissionPayload = {
  studentId: string;
  campusId?: string;
  termId?: string;
  teacherId?: string;
  subject: string;
  homeworkDate: string;
  fileIds: string[];
  sourceType?: string;
  remark?: string;
};

export type HomeworkReviewDraftPayload = {
  reviewResult?: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number;
  finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  finalErrorSummary?: string;
  finalSuggestion?: string;
  publishToFamily?: boolean;
  reviewerTeacherId?: string;
};

export type HomeworkReviewSubmitPayload = Required<Pick<HomeworkReviewDraftPayload, 'reviewResult'>> & HomeworkReviewDraftPayload;

export type TriggerHomeworkAnalysisPayload = {
  force?: boolean;
  provider?: string;
  modelName?: string;
  promptVersion?: string;
};

export type BulkHomeworkReviewTagsPayload = {
  submissionIds: string[];
  reviewerTeacherId?: string;
  finalErrorItems: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  finalErrorSummary?: string;
  mode?: 'merge' | 'replace';
};

export type HomeworkAnalysisStatusDetail = {
  submissionId: string;
  aiStatus: 'pending' | 'running' | 'ready' | 'failed' | 'skipped';
  reviewStatus: string;
  latestJob: {
    jobId?: string;
    status?: string | null;
  } | null;
  latestAnalysis: {
    jobId?: string | null;
    status?: string | null;
    provider?: string | null;
    modelName?: string | null;
    promptVersion?: string | null;
    rawMarkdown?: string | null;
    structuredOutput?: unknown;
  } | null;
};

const formatAccuracy = (value?: number | null) => (typeof value === 'number' ? `${value}%` : '--');
const formatAt = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '--');
const reviewStatusLabel = (value?: string | null) => value ?? '--';
const formatSize = (value?: number | null) => (typeof value === 'number' ? `${(value / 1024).toFixed(value >= 1024 * 1024 ? 1 : 0)} KB` : '--');

async function fetchStudentNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; name: string }>>('/students?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.name]));
}

async function fetchTeacherNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; name: string }>>('/teachers?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.name]));
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const homeworkService = {
  async query(params: HomeworkSubmissionQuery = {}): Promise<PageResult<HomeworkSubmissionItem>> {
    const result = await serverApiRequest<PageResult<{
      id: string;
      submissionNo?: string | null;
      studentId: string;
      teacherId?: string | null;
      subject: string;
      uploadedAt?: string | null;
      homeworkDate: string;
      aiStatus?: string | null;
      finalAccuracyPct?: number | null;
      reviewStatus?: string | null;
    }>>(`/homework/submissions${buildQuery(params)}`);

    return {
      ...result,
      list: result.list.map((item) => ({
        submissionId: item.id,
        submissionNo: item.submissionNo ?? item.id,
        studentName: item.studentId,
        subject: item.subject,
        submittedAt: formatAt(item.uploadedAt ?? item.homeworkDate),
        aiStatus: item.aiStatus ?? '--',
        finalAccuracy: formatAccuracy(item.finalAccuracyPct),
        reviewStatus: reviewStatusLabel(item.reviewStatus),
        teacherName: item.teacherId ?? '--',
        actions: '预览附件 / 触发 AI / 进入复核台',
      })),
    };
  },

  async detail(submissionId: string) {
    const [detail, allSubmissions, studentNameById, teacherNameById] = await Promise.all([
      serverApiRequest<{
        submission: {
          id: string;
          submissionNo?: string | null;
          studentId: string;
          teacherId?: string | null;
          subject: string;
          reviewStatus?: string | null;
          finalAccuracyPct?: number | null;
        };
        files: Array<{ fileId?: string; id?: string }>;
        latestAiAnalysis: {
          jobId?: string;
          status?: string;
          provider?: string;
          modelName?: string;
          promptVersion?: string;
          rawMarkdown?: string;
          structuredOutput?: unknown;
        } | null;
        analysisStatus?: HomeworkAnalysisStatusDetail | null;
        review: {
          reviewResult?: string | null;
          finalErrorSummary?: string | null;
          finalSuggestion?: string | null;
          finalAccuracyPct?: number | null;
          updatedAt?: string | null;
          publishToFamily?: boolean | null;
        } | null;
        reviewDraft: {
          reviewResult?: 'approved' | 'adjusted' | 'rejected';
          finalAccuracyPct?: number | null;
          finalErrorSummary?: string | null;
          finalSuggestion?: string | null;
          publishToFamily?: boolean;
          reviewerTeacherId?: string | null;
          finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
          savedAt?: string;
          updatedAt?: string;
        } | null;
      }>(`/homework/submissions/${submissionId}`),
      this.query({ pageNo: 1, pageSize: 100, sortBy: 'homeworkDate', sortOrder: 'desc' }),
      fetchStudentNameById().catch(() => new Map<string, string>()),
      fetchTeacherNameById().catch(() => new Map<string, string>()),
    ]);
    const currentIndex = allSubmissions.list.findIndex((item) => item.submissionId === submissionId);
    const prevSubmission = currentIndex >= 0 ? allSubmissions.list[currentIndex - 1] ?? null : null;
    const nextSubmission = currentIndex >= 0 ? allSubmissions.list[currentIndex + 1] ?? null : null;
    const attachments = await Promise.all(detail.files.map(async (file, index) => {
      const fileId = file.fileId ?? file.id ?? `file-${index + 1}`;

      try {
        const fileDetail = await serverApiRequest<{
          fileId: string;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          url?: string | null;
          storageProvider?: string;
        }>(`/files/${fileId}`);
        const canOpenDirectly = typeof fileDetail.url === 'string' && /^https?:\/\//.test(fileDetail.url);

        return {
          name: fileDetail.fileName,
          detail: `${fileDetail.mimeType} / ${formatSize(fileDetail.sizeBytes)} / ${fileDetail.storageProvider ?? 'unknown provider'}`,
          fileId,
          href: `/api/files/${fileId}`,
          directHref: canOpenDirectly ? fileDetail.url : null,
          blockedReason: canOpenDirectly ? null : '当前 storage adapter 返回的仍是非 HTTP 地址，浏览器仅能查看元数据。',
        };
      } catch {
        return {
          name: fileId,
          detail: '已关联真实 fileId，但暂时未拉到文件元数据。',
          fileId,
          href: `/api/files/${fileId}`,
          directHref: null,
          blockedReason: '文件详情请求失败，当前先保留 fileId 元数据入口。',
        };
      }
    }));

    return {
      submissionId,
      submissionNo: detail.submission.submissionNo ?? submissionId,
      studentName: studentNameById.get(detail.submission.studentId) ?? detail.submission.studentId,
      subject: detail.submission.subject,
      teacherName: detail.submission.teacherId ? teacherNameById.get(detail.submission.teacherId) ?? detail.submission.teacherId : '--',
      aiJob: {
        jobId: detail.analysisStatus?.latestJob?.jobId ?? detail.latestAiAnalysis?.jobId ?? 'job_pending',
        status: detail.analysisStatus?.aiStatus ?? 'pending',
        provider: detail.analysisStatus?.latestAnalysis?.provider ?? detail.latestAiAnalysis?.provider ?? '--',
        model: detail.analysisStatus?.latestAnalysis?.modelName ?? detail.latestAiAnalysis?.modelName ?? '--',
        promptVersion: detail.analysisStatus?.latestAnalysis?.promptVersion ?? detail.latestAiAnalysis?.promptVersion ?? '--',
      },
      attachments,
      rawMarkdown: detail.analysisStatus?.latestAnalysis?.rawMarkdown ?? detail.latestAiAnalysis?.rawMarkdown ?? [
        '# AI 批改摘要',
        '',
        `- 正确率建议：${formatAccuracy(detail.review?.finalAccuracyPct ?? detail.submission.finalAccuracyPct)}`,
        `- 复核结论：${detail.review?.reviewResult ?? detail.reviewDraft?.reviewResult ?? '待复核'}`,
      ].join('\n'),
      structuredResult: detail.analysisStatus?.latestAnalysis?.structuredOutput ?? detail.latestAiAnalysis?.structuredOutput ?? {
        accuracyPct: detail.review?.finalAccuracyPct ?? detail.reviewDraft?.finalAccuracyPct ?? detail.submission.finalAccuracyPct ?? null,
        finalErrorSummary: detail.review?.finalErrorSummary ?? detail.reviewDraft?.finalErrorSummary ?? null,
        finalSuggestion: detail.review?.finalSuggestion ?? detail.reviewDraft?.finalSuggestion ?? null,
      },
      suggestions: [
        { title: '错因建议', detail: detail.review?.finalErrorSummary ?? detail.reviewDraft?.finalErrorSummary ?? '等待 AI/教师补充错因摘要。' },
        { title: '家长反馈草案', detail: detail.review?.finalSuggestion ?? detail.reviewDraft?.finalSuggestion ?? '等待教师填写家长反馈建议。' },
      ],
      reviewMeta: [
        { name: '复核状态', detail: detail.submission.reviewStatus ?? 'unreviewed' },
        { name: '最近保存', detail: formatAt(detail.reviewDraft?.savedAt ?? detail.reviewDraft?.updatedAt ?? detail.review?.updatedAt) },
        { name: '正式提交', detail: '当前页面可直接提交。' },
      ],
      navigation: {
        prev: prevSubmission ? { id: prevSubmission.submissionId, label: prevSubmission.submissionNo } : null,
        next: nextSubmission ? { id: nextSubmission.submissionId, label: nextSubmission.submissionNo } : null,
      },
      reviewDraft: detail.reviewDraft,
      review: detail.review,
    };
  },

  async createSubmission(payload: CreateHomeworkSubmissionPayload) {
    return serverApiRequest<{ id: string; submissionNo?: string | null }>(`/homework/submissions`, {
      method: 'POST',
      body: payload,
    });
  },

  async saveReviewDraft(submissionId: string, payload: HomeworkReviewDraftPayload) {
    return serverApiRequest(`/homework/submissions/${submissionId}/review-draft`, {
      method: 'PUT',
      body: payload,
    });
  },

  async submitReview(submissionId: string, payload: HomeworkReviewSubmitPayload) {
    return serverApiRequest(`/homework/submissions/${submissionId}/review`, {
      method: 'POST',
      body: payload,
    });
  },

  async triggerAnalysis(submissionId: string, payload: TriggerHomeworkAnalysisPayload = {}) {
    return serverApiRequest<{ jobId: string; status: string }>(`/homework/submissions/${submissionId}/analyze`, {
      method: 'POST',
      body: payload,
    });
  },

  async bulkTriggerAnalysis(payload: TriggerHomeworkAnalysisPayload & { submissionIds: string[] }) {
    return serverApiRequest<{ count: number; submissionIds: string[]; results: Array<{ submissionId: string; jobId: string; status: string }> }>(`/homework/submissions/bulk-analyze`, {
      method: 'POST',
      body: payload,
    });
  },

  async bulkApplyReviewTags(payload: BulkHomeworkReviewTagsPayload) {
    return serverApiRequest<{ count: number; submissionIds: string[]; results: Array<{ submissionId: string; reviewStatus: string; tagCount: number }>; mode: 'merge' | 'replace' }>(`/homework/submissions/bulk-review-tags`, {
      method: 'POST',
      body: payload,
    });
  },

  action(submissionId: string) {
    return {
      submissionId,
      analyzeEndpoint: `/homework/submissions/${submissionId}/analyze`,
      exportTemplate: 'homework-submissions-export.csv',
    };
  },

  async taxonomyQuery(params: QueryBase = {}): Promise<PageResult<ErrorTaxonomyItem>> {
    const result = await serverApiRequest<Array<{
      id: string;
      code: string;
      name: string;
      category?: string;
      subject?: string;
      subjectScope?: string;
      stageScope?: string;
      status: ErrorTaxonomyStatus;
      sortOrder: number;
    }>>(`/homework/error-taxonomies${buildQuery(params)}`);

    return {
      list: result.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category ?? item.stageScope ?? '--',
        subjects: item.subjectScope ?? item.subject ?? '--',
        enabled: item.status,
        sort: String(item.sortOrder),
        actions: '编辑 / 停用 / 排序',
      })),
      page: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? (result.length || 20),
        total: result.length,
      },
    };
  },

  async createTaxonomy(payload: ErrorTaxonomyFormPayload) {
    return serverApiRequest<{ id: string; code: string; name: string }>(`/homework/error-taxonomies`, {
      method: 'POST',
      body: payload,
    });
  },

  async updateTaxonomy(taxonomyId: string, payload: Partial<ErrorTaxonomyFormPayload>) {
    return serverApiRequest<{ id: string; code: string; name: string }>(`/homework/error-taxonomies/${taxonomyId}`, {
      method: 'PATCH',
      body: payload,
    });
  },
};
