import type { PageResult, QueryBase } from '@/features/shared/types';

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

const submissions: HomeworkSubmissionItem[] = [
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
  {
    submissionId: 'HW-20260323-019',
    studentName: '赵安安',
    subject: '英语',
    submittedAt: '2026-03-23 20:05',
    aiStatus: 'failed',
    finalAccuracy: '--',
    reviewStatus: 'exception',
    teacherName: '王老师',
    actions: '预览附件 / 重试 AI / 查看失败原因',
  },
];

const errorTaxonomies: ErrorTaxonomyItem[] = [
  { code: 'calc-careless', name: '计算粗心', category: '计算错误', subjects: '数学', enabled: '启用', sort: '10', actions: '编辑 / 停用 / 上移' },
  { code: 'concept-misaligned', name: '概念偏差', category: '知识理解', subjects: '数学, 科学', enabled: '启用', sort: '20', actions: '编辑 / 停用 / 下移' },
  { code: 'reading-miss', name: '审题遗漏', category: '策略习惯', subjects: '全学科', enabled: '草稿', sort: '30', actions: '编辑 / 启用 / 预览' },
];

export const homeworkService = {
  query(params: HomeworkSubmissionQuery = {}): PageResult<HomeworkSubmissionItem> {
    return {
      list: submissions,
      page: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 20,
        total: submissions.length,
      },
    };
  },
  detail(submissionId: string) {
    return {
      submissionId,
      studentName: '张小北',
      subject: '数学',
      teacherName: '周老师',
      aiJob: {
        jobId: 'job_hw_review_001',
        status: 'succeeded',
        provider: 'mock-gpt',
        model: 'gpt-4.1-mini',
        promptVersion: 'homework-v1',
      },
      attachments: [
        { name: 'page-1.jpg', detail: '原图附件页 1，占位缩略图 + 放大入口' },
        { name: 'page-2.jpg', detail: '原图附件页 2，占位缩略图 + OCR 标记层预留' },
      ],
      rawMarkdown: ['# AI 批改摘要', '', '- 正确率建议：91%', '- 高频问题：计算步骤漏写、题干条件回读不足', '- 建议错因：calc-careless / concept-misaligned'].join('\n'),
      structuredResult: {
        accuracyPct: 91,
        detectedErrors: [
          { code: 'calc-careless', confidence: 0.91, questionNo: 'Q2' },
          { code: 'concept-misaligned', confidence: 0.72, questionNo: 'Q4' },
        ],
        parentSuggestion: '建议先复述题意，再做验算。',
      },
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
  },
  action(submissionId: string) {
    return {
      submissionId,
      analyzeJob: { jobId: 'job_hw_retry_002', status: 'queued' },
      exportTemplate: 'homework-submissions-export.csv',
    };
  },
  taxonomyQuery(params: QueryBase = {}): PageResult<ErrorTaxonomyItem> {
    return {
      list: errorTaxonomies,
      page: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 20,
        total: errorTaxonomies.length,
      },
    };
  },
};
