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
      editorNotice: 'rubric 列表与 detail 已切到真实接口；模板编辑保存仍待下一波接入。',
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

  createObservation() {
    return {
      schemaKey: 'observation.dynamic.rubric-template-v1',
      createPermission: 'growth:observations:manage',
      idempotencyHint: '创建观察已存在真实 POST /growth/observations，当前页先完成列表真化。',
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
        { name: '关联观察', detail: '后端暂未提供 goal -> observation 聚合关系，当前页先显示真实 goal/checkin 数据。' },
        { name: '关联家庭任务', detail: '当前后端未提供该聚合，先明确缺口，不再伪装成本地 mock。' },
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
      editor: {
        materialPool: [
          { name: '作业复核摘要', detail: '后端尚未提供 homework -> growth 报告聚合接口，暂保留缺口说明。' },
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

  actionReport() {
    return {
      generateEndpoint: '/growth/reports/generate',
      reviewEndpoint: '/growth/reports/{reportId}/review',
      publishEndpoint: '/growth/reports/{reportId}/publish',
      note: 'reports 列表与首条 detail 已接真实接口；生成/复核/发布动作接口已存在，编辑器交互留待后续。',
    };
  },
};
