import type { QueryBase } from '@/features/shared/types';
import type { PageResult } from '@/lib/api-client';
import { serverApiRequest } from '@/lib/server-api';

export type RubricTemplateItem = {
  rubricId: string;
  name: string;
  scope: string;
  version: string;
  status: string;
  dimensions: number;
  updatedAt: string;
};

export type CreateObservationPayload = {
  studentId: string;
  termId?: string;
  teacherId?: string;
  templateId: string;
  observationDate: string;
  scene: string;
  scores: Array<{ dimensionId: string; score: number; note?: string }>;
  strengths?: string;
  improvementNotes?: string;
  publishToFamily?: boolean;
};

export type CreateGoalPayload = {
  studentId: string;
  termId?: string;
  goalType: string;
  title: string;
  description?: string;
  ownerRole?: string;
  metricType?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  startDate?: string;
  dueDate?: string;
  status?: string;
};

export type CreateGoalCheckinPayload = {
  checkinDate: string;
  progressValue?: number;
  progressNote?: string;
  nextAction?: string;
};

export type GenerateReportPayload = {
  reportType: 'weekly' | 'monthly';
  periodKey: string;
  studentIds: string[];
  termId?: string;
  campusId?: string;
};

export type ReviewReportPayload = {
  reviewerUserId?: string;
  reviewNote?: string;
  title?: string;
  draftMarkdown?: string;
  summaryJson?: Record<string, unknown>;
};

export type PublishReportPayload = {
  publisherUserId?: string;
  publishNote?: string;
  channels?: string[];
};

export type ObservationItem = {
  observationId: string;
  observedAt: string;
  studentName: string;
  teacherName: string;
  scene: string;
  totalScore: string;
  reportPublished: string;
  status: string;
};

export type GoalItem = {
  goalId: string;
  studentName: string;
  goalType: string;
  title: string;
  progress: string;
  targetValue: string;
  dueDate: string;
  status: string;
  checkins: Array<{ id: string; checkinDate: string; progressValue?: number | null; progressNote?: string | null; nextAction?: string | null }>;
};

export type ReportQueueItem = {
  reportId: string;
  studentName: string;
  reportType: string;
  period: string;
  owner: string;
  status: string;
  actionHint: string;
};

export type GrowthQuery = QueryBase & {
  studentId?: string;
  teacherId?: string;
  dateFrom?: string;
  dateTo?: string;
  scene?: string;
  reportPublished?: string;
  reportType?: string;
  publishStatus?: string;
  status?: string;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      query.set(key === 'publishStatus' ? 'status' : key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

const formatDateTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '--');

export const growthService = {
  async queryRubrics(params: QueryBase = {}): Promise<PageResult<RubricTemplateItem>> {
    const result = await serverApiRequest<PageResult<{ id: string; campusId?: string | null; termId?: string | null; name: string; status: string; dimensions: unknown[]; updatedAt: string }>>(`/growth/rubrics${buildQuery(params)}`);
    return {
      ...result,
      list: result.list.map((item) => ({
        rubricId: item.id,
        name: item.name,
        scope: [item.campusId ?? '全校区', item.termId ?? '通用'].join(' / '),
        version: `dim-${item.dimensions.length}`,
        status: item.status,
        dimensions: item.dimensions.length,
        updatedAt: formatDateTime(item.updatedAt),
      })),
    };
  },

  async detailRubric(rubricId: string) {
    const detail = await serverApiRequest<{ id: string; name: string; status: string; dimensions: Array<{ id: string; code: string; name: string; weight: number; scoreMin: number; scoreMax: number; description?: string; sortOrder: number }> }>(`/growth/rubrics/${rubricId}`);
    return {
      rubricId: detail.id,
      name: detail.name,
      schemaVersion: 'rubric-template-v1',
      status: detail.status,
      dimensions: detail.dimensions.map((dimension) => ({
        id: dimension.id,
        code: dimension.code,
        name: dimension.name,
        weight: dimension.weight,
        scoreRange: `${dimension.scoreMin}-${dimension.scoreMax}`,
        description: dimension.description ?? '--',
        sort: dimension.sortOrder,
      })),
      editorNotice: 'rubric 列表与 detail 已切到真实接口。',
    };
  },

  async queryObservations(params: GrowthQuery = {}): Promise<PageResult<ObservationItem>> {
    const result = await serverApiRequest<PageResult<{ id: string; observationDate: string; studentId: string; teacherId?: string | null; scene: string; totalScore: number; publishToFamily?: boolean; updatedAt: string }>>(`/growth/observations${buildQuery(params)}`);
    return {
      ...result,
      list: result.list.map((item) => ({
        observationId: item.id,
        observedAt: item.observationDate,
        studentName: item.studentId,
        teacherName: item.teacherId ?? '--',
        scene: item.scene,
        totalScore: String(item.totalScore),
        reportPublished: item.publishToFamily ? '已纳入' : '待纳入',
        status: item.publishToFamily ? 'published' : 'draft',
      })),
    };
  },

  async createObservationEntry(payload: CreateObservationPayload) {
    return serverApiRequest<{ id: string; studentId: string; templateId: string }>(`/growth/observations`, {
      method: 'POST',
      body: payload,
    });
  },

  createObservation() {
    return {
      schemaKey: 'observation.dynamic.rubric-template-v1',
      createPermission: 'growth:observations:manage',
      idempotencyHint: '已开放真实创建接口。',
    };
  },

  async queryGoals(params: GrowthQuery = {}): Promise<PageResult<GoalItem>> {
    const result = await serverApiRequest<PageResult<{ id: string; studentId: string; goalType: string; title: string; currentValue?: number | null; targetValue?: number | null; dueDate: string; status: string; checkins?: Array<{ id: string; checkinDate: string; progressValue?: number | null; progressNote?: string | null; nextAction?: string | null }> }>>(`/growth/goals${buildQuery(params)}`);
    return {
      ...result,
      list: result.list.map((item) => ({
        goalId: item.id,
        studentName: item.studentId,
        goalType: item.goalType,
        title: item.title,
        progress: item.currentValue === null || item.currentValue === undefined ? '--' : String(item.currentValue),
        targetValue: item.targetValue === null || item.targetValue === undefined ? '--' : String(item.targetValue),
        dueDate: item.dueDate,
        status: item.status,
        checkins: item.checkins ?? [],
      })),
    };
  },

  async createGoal(payload: CreateGoalPayload) {
    return serverApiRequest<{ id: string; title: string }>(`/growth/goals`, {
      method: 'POST',
      body: payload,
    });
  },

  async createGoalCheckin(goalId: string, payload: CreateGoalCheckinPayload) {
    return serverApiRequest<{ id: string; goalId: string }>(`/growth/goals/${goalId}/checkins`, {
      method: 'POST',
      body: payload,
    });
  },

  async detailGoal(goalId: string) {
    const goals = await this.queryGoals({ pageNo: 1, pageSize: 100 });
    const goal = goals.list.find((item) => item.goalId === goalId) ?? goals.list[0] ?? null;
    return {
      goalId,
      profile: [
        { name: '目标类型', detail: goal?.goalType ?? '--' },
        { name: '关联学生', detail: goal?.studentName ?? '--' },
        { name: '截止时间', detail: goal?.dueDate ?? '--' },
      ],
      followups: (goal?.checkins ?? []).map((item) => ({
        title: `${item.checkinDate} · ${item.progressValue ?? '--'}`,
        detail: [item.progressNote, item.nextAction].filter(Boolean).join(' / ') || '已记录 check-in。',
      })),
      linkedItems: [
        { name: '关联观察', detail: '当前后端未返回 goal -> observation 聚合关系。' },
        { name: '关联家庭任务', detail: '当前后端未提供该聚合。' },
      ],
      nextAction: 'goal 列表与 check-in 历史已来自真实接口。',
    };
  },

  actionGoal(goalId: string) {
    return {
      goalId,
      action: 'check-in',
      endpoint: `/growth/goals/${goalId}/checkins`,
      permissionCode: 'growth:goals:manage',
      idempotencyKeyRequired: false,
    };
  },

  async queryReports(params: GrowthQuery = {}) {
    const statusMap: Record<string, 'queued' | 'drafts' | 'published'> = { queued: 'queued', draft: 'drafts', reviewed: 'drafts', published: 'published' };
    const result = await serverApiRequest<PageResult<{ id: string; studentId: string; reportType: string; periodKey: string; ownerUserId?: string | null; status: string }>>(`/growth/reports${buildQuery(params)}`);
    const groups = { queued: [] as ReportQueueItem[], drafts: [] as ReportQueueItem[], published: [] as ReportQueueItem[] };

    result.list.forEach((item) => {
      const target = statusMap[item.status] ?? 'queued';
      groups[target].push({
        reportId: item.id,
        studentName: item.studentId,
        reportType: item.reportType,
        period: item.periodKey,
        owner: item.ownerUserId ?? '--',
        status: item.status,
        actionHint: target === 'published' ? '已发布，可回看历史' : target === 'drafts' ? '草稿/待复核，继续处理' : '待生成/待补素材',
      });
    });

    const firstReportId = result.list[0]?.id;
    const firstDetail = firstReportId
      ? await serverApiRequest<{ report: { id: string; title?: string | null; draftMarkdown?: string | null; status: string; updatedAt?: string | null }; workflow?: Record<string, unknown> }>(`/growth/reports/${firstReportId}`)
      : null;

    return {
      filters: params,
      queued: groups.queued,
      drafts: groups.drafts,
      published: groups.published,
      all: result.list,
      firstReportId,
      editor: {
        materialPool: [
          { name: '作业复核摘要', detail: '后端尚未提供 homework -> growth 报告聚合接口。' },
          { name: '成长观察', detail: 'observations 列表已接真接口。' },
          { name: '成长目标', detail: 'goals 列表已接真接口。' },
        ],
        draftSections: [
          { title: firstDetail?.report.title ?? '报告正文', detail: firstDetail?.report.draftMarkdown ?? '当前无报告草稿内容。' },
          { title: '工作流状态', detail: `status=${firstDetail?.report.status ?? 'queued'} / updatedAt=${formatDateTime(firstDetail?.report.updatedAt)}` },
        ],
        publishSettings: [
          { name: '发送渠道', detail: 'POST /growth/reports/{id}/publish 支持 channels[]。' },
          { name: '发布状态', detail: 'draft -> reviewed -> published' },
          { name: '发布人', detail: 'publisherUserId 由当前登录用户注入。' },
        ],
      },
    };
  },

  async generateReport(payload: GenerateReportPayload) {
    return serverApiRequest<{ createdIds?: string[]; count?: number }>(`/growth/reports/generate`, {
      method: 'POST',
      body: payload,
    });
  },

  async reviewReport(reportId: string, payload: ReviewReportPayload) {
    return serverApiRequest<{ id: string; status?: string }>(`/growth/reports/${reportId}/review`, {
      method: 'POST',
      body: payload,
    });
  },

  async publishReport(reportId: string, payload: PublishReportPayload) {
    return serverApiRequest<{ id: string; status?: string }>(`/growth/reports/${reportId}/publish`, {
      method: 'POST',
      body: payload,
    });
  },

  actionReport() {
    return {
      generateEndpoint: '/growth/reports/generate',
      reviewEndpoint: '/growth/reports/{reportId}/review',
      publishEndpoint: '/growth/reports/{reportId}/publish',
      note: 'reports 列表、detail、generate/review/publish 都已接真实接口。',
    };
  },
};
