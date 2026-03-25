import { apiRequest, type PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';

export type HomeworkSubmissionItem = {
  submissionId: string;
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
  code: string;
  name: string;
  category: string;
  subjects: string;
  enabled: string;
  sort: string;
  actions: string;
};

const fallbackSubmissions: HomeworkSubmissionItem[] = [
  {
    submissionId: 'HW-20260324-001',
    studentName: '张小北',
    subject: '数学',
    submittedAt: '2026-03-24 18:20',
    aiStatus: 'succeeded',
    finalAccuracy: '91%',
    reviewStatus: 'draft',
    teacherName: '周老师',
    actions: '预览附件 / 触发 AI / 进入复核台',
  },
  {
    submissionId: 'HW-20260324-002',
    studentName: '林一诺',
    subject: '语文',
    submittedAt: '2026-03-24 17:55',
    aiStatus: 'running',
    finalAccuracy: '--',
    reviewStatus: 'pending',
    teacherName: '吴老师',
    actions: '预览附件 / AI 运行中 / 锁定复核台',
  },
];

const fallbackErrorTaxonomies: ErrorTaxonomyItem[] = [
  { code: 'calc-careless', name: '计算粗心', category: '计算错误', subjects: '数学', enabled: '启用', sort: '10', actions: '编辑 / 停用 / 上移' },
  { code: 'concept-misaligned', name: '概念偏差', category: '知识理解', subjects: '数学, 科学', enabled: '启用', sort: '20', actions: '编辑 / 停用 / 下移' },
];

const formatAccuracy = (value?: number | null) => (typeof value === 'number' ? `${value}%` : '--');
const formatAt = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '--');
const reviewStatusLabel = (value?: string | null) => value ?? '--';

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
    try {
      const result = await apiRequest<PageResult<{
        id: string;
        studentId: string;
        teacherId?: string | null;
        subject: string;
        submittedAt?: string | null;
        homeworkDate: string;
        aiStatus?: string | null;
        finalAccuracyPct?: number | null;
        reviewStatus?: string | null;
        submissionNo?: string | null;
      }>>(`/homework/submissions${buildQuery(params)}`);

      return {
        ...result,
        list: result.list.map((item) => ({
          submissionId: item.id,
          studentName: item.studentId,
          subject: item.subject,
          submittedAt: formatAt(item.submittedAt ?? item.homeworkDate),
          aiStatus: item.aiStatus ?? '--',
          finalAccuracy: formatAccuracy(item.finalAccuracyPct),
          reviewStatus: reviewStatusLabel(item.reviewStatus),
          teacherName: item.teacherId ?? '--',
          actions: '预览附件 / 触发 AI / 进入复核台',
        })),
      };
    } catch {
      return {
        list: fallbackSubmissions,
        page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: fallbackSubmissions.length },
      };
    }
  },

  async detail(submissionId: string) {
    try {
      const detail = await apiRequest<{
        submission: {
          id: string;
          studentId: string;
          teacherId?: string | null;
          subject: string;
          finalAccuracyPct?: number | null;
          reviewStatus?: string | null;
        };
        files: Array<{ fileId?: string; id?: string }>;
        latestAiAnalysis: { jobId?: string; status?: string; provider?: string; modelName?: string; promptVersion?: string; rawMarkdown?: string; structuredResult?: unknown } | null;
        review: { finalErrorSummary?: string | null; finalSuggestion?: string | null; reviewResult?: string | null; finalAccuracyPct?: number | null; updatedAt?: string | null } | null;
      }>(`/homework/submissions/${submissionId}`);

      return {
        submissionId,
        studentName: detail.submission.studentId,
        subject: detail.submission.subject,
        teacherName: detail.submission.teacherId ?? '--',
        aiJob: {
          jobId: detail.latestAiAnalysis?.jobId ?? 'job_pending',
          status: detail.latestAiAnalysis?.status ?? detail.submission.reviewStatus ?? 'pending',
          provider: detail.latestAiAnalysis?.provider ?? 'mock-provider',
          model: detail.latestAiAnalysis?.modelName ?? 'mock-vision-v1',
          promptVersion: detail.latestAiAnalysis?.promptVersion ?? 'homework-review-v3',
        },
        attachments: detail.files.map((file, index) => ({ name: file.fileId ?? file.id ?? `file-${index + 1}`, detail: '真实 fileId 已接入，预览缩略图层待接 files 下载/预览接口。' })),
        rawMarkdown: detail.latestAiAnalysis?.rawMarkdown ?? ['# AI 批改摘要', '', `- 正确率建议：${formatAccuracy(detail.review?.finalAccuracyPct ?? detail.submission.finalAccuracyPct)}`, `- 复核结论：${detail.review?.reviewResult ?? '待复核'}`].join('\n'),
        structuredResult: detail.latestAiAnalysis?.structuredResult ?? {
          accuracyPct: detail.review?.finalAccuracyPct ?? detail.submission.finalAccuracyPct ?? null,
          finalErrorSummary: detail.review?.finalErrorSummary ?? null,
          finalSuggestion: detail.review?.finalSuggestion ?? null,
        },
        suggestions: [
          { title: '错因建议', detail: detail.review?.finalErrorSummary ?? '等待 AI/教师补充错因摘要。' },
          { title: '家长反馈草案', detail: detail.review?.finalSuggestion ?? '等待教师填写家长反馈建议。' },
        ],
        reviewMeta: [
          { name: '复核状态', detail: detail.submission.reviewStatus ?? 'unreviewed' },
          { name: '最近保存', detail: formatAt(detail.review?.updatedAt) },
          { name: '幂等要求', detail: '正式提交 review 仍要求 Idempotency-Key。' },
        ],
      };
    } catch {
      return {
        submissionId,
        studentName: '张小北',
        subject: '数学',
        teacherName: '周老师',
        aiJob: { jobId: 'job_hw_review_001', status: 'succeeded', provider: 'mock-gpt', model: 'gpt-4.1-mini', promptVersion: 'homework-v1' },
        attachments: [
          { name: 'page-1.jpg', detail: '原图附件页 1，占位缩略图 + 放大入口' },
          { name: 'page-2.jpg', detail: '原图附件页 2，占位缩略图 + OCR 标记层预留' },
        ],
        rawMarkdown: '# AI 批改摘要\n\n- 正确率建议：91%\n- 高频问题：计算步骤漏写、题干条件回读不足',
        structuredResult: { accuracyPct: 91 },
        suggestions: [
          { title: '错因建议', detail: 'AI 建议优先勾选“计算粗心 + 概念偏差”。' },
          { title: '家长反馈草案', detail: '建议鼓励孩子先讲思路，再做二次验算。' },
        ],
        reviewMeta: [
          { name: '复核状态', detail: 'draft / 已存在临时草稿' },
          { name: '最近保存', detail: '2026-03-24 19:40 / operator: 周老师' },
          { name: '幂等要求', detail: '正式提交 action 需预留 Idempotency-Key。' },
        ],
      };
    }
  },

  action(submissionId: string) {
    return {
      submissionId,
      analyzeJob: { jobId: 'job_hw_retry_002', status: 'queued' },
      exportTemplate: 'homework-submissions-export.csv',
    };
  },

  async taxonomyQuery(params: QueryBase = {}): Promise<PageResult<ErrorTaxonomyItem>> {
    return {
      list: fallbackErrorTaxonomies,
      page: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 20,
        total: fallbackErrorTaxonomies.length,
      },
    };
  },
};
