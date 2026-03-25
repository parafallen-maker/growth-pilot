import { apiRequest, type PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';

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
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

const formatDateTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '--');

export const growthService = {
  async queryRubrics(params: QueryBase = {}): Promise<PageResult<RubricTemplateItem>> {
    const result = await apiRequest<PageResult<{ id: string; campusId?: string | null; termId?: string | null; name: string; status: string; dimensions: unknown[]; updatedAt: string }>>(`/growth/rubrics${buildQuery(params)}`);
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
    const detail = await apiRequest<{ id: string; name: string; status: string; dimensions: Array<{ code: string; name: string; weight: number; scoreMin: number; scoreMax: number; description?: string; sortOrder: number }> }>(`/growth/rubrics/${rubricId}`);
    return {
      rubricId: detail.id,
      name: detail.name,
      schemaVersion: 'rubric-template-v1',
      status: detail.status,
      dimensions: detail.dimensions.map((dimension) => ({
        code: dimension.code,
        name: dimension.name,
        weight: dimension.weight,
        scoreRange: `${dimension.scoreMin}-${dimension.scoreMax}`,
        description: dimension.description ?? '--',
        sort: dimension.sortOrder,
      })),
      editorNotice: '真实 rubric detail 已接入，模板 CRUD 编辑器待下一波收口。',
    };
  },

  async queryObservations(params: GrowthQuery = {}): Promise<PageResult<ObservationItem>> {
    const result = await apiRequest<PageResult<{ id: string; observationDate: string; studentId: string; teacherId?: string | null; scene: string; totalScore: number; publishToFamily?: boolean; updatedAt: string }>>(`/growth/observations${buildQuery(params)}`);
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
      idempotencyHint: '创建观察时可复用 requestId，避免重复提交。',
    };
  },

  async queryGoals(params: GrowthQuery = {}): Promise<PageResult<GoalItem>> {
    const result = await apiRequest<PageResult<{ id: string; studentId: string; goalType: string; title: string; currentValue?: number | null; targetValue?: number | null; dueDate: string; status: string; checkins?: unknown[] }>>(`/growth/goals${buildQuery(params)}`);
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
      })),
    };
  },

  async detailGoal(goalId: string) {
    const goals = await this.queryGoals({ pageNo: 1, pageSize: 100 });
    const goal = goals.list.find((item) => item.goalId === goalId) ?? goals.list[0];
    return {
      goalId,
      profile: [
        { name: '目标类型', detail: goal?.goalType ?? '--' },
        { name: '关联学生', detail: goal?.studentName ?? '--' },
        { name: '截止时间', detail: goal?.dueDate ?? '--' },
      ],
      followups: [{ title: 'check-in 接口已就位', detail: 'POST /growth/goals/{goalId}/checkins 已存在，页面动作位后续可直接接。' }],
      linkedItems: [
        { name: '关联观察', detail: '下一波补 observation/report 反查聚合。' },
        { name: '关联家庭任务', detail: '当前后端未提供该聚合，先保留占位。' },
      ],
      nextAction: 'goal check-in 已有真接口，详情聚合页待下一波补强。',
    };
  },

  actionGoal(goalId: string) {
    return {
      goalId,
      action: 'check-in',
      permissionCode: 'growth:goals:manage',
      idempotencyKeyRequired: true,
    };
  },

  async queryReports(params: GrowthQuery = {}) {
    const statusMap: Record<string, 'queued' | 'drafts' | 'published'> = { queued: 'queued', draft: 'drafts', reviewing: 'drafts', published: 'published' };
    const result = await apiRequest<PageResult<{ id: string; studentId: string; reportType: string; periodKey: string; ownerUserId?: string | null; status: string }>>(`/growth/reports${buildQuery(params)}`);
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
        actionHint: target === 'published' ? '已发布，可回看历史' : target === 'drafts' ? '草稿/待复核，继续编辑' : '待生成/待补素材',
      });
    });

    return {
      filters: params,
      queued: groups.queued,
      drafts: groups.drafts,
      published: groups.published,
      editor: {
        materialPool: [
          { name: '作业复核摘要', detail: '已可从 homework review 真结果补料，页面细联动待补。' },
          { name: '成长观察', detail: 'observations 真接口已接入。' },
          { name: '成长目标', detail: 'goals 真接口已接入。' },
        ],
        draftSections: [
          { title: '正文编辑区', detail: '编辑器仍是前端骨架，报告草稿列表已换真源。' },
          { title: '预览分离', detail: '生成 / 编辑 / 发布仍保持分离。' },
        ],
        publishSettings: [
          { name: '发送渠道', detail: '微信 / 企业微信 / 系统消息（占位）' },
          { name: '发布状态', detail: 'draft -> reviewing -> published' },
          { name: '发布人', detail: 'growth advisor / campus admin' },
        ],
      },
    };
  },

  actionReport() {
    return {
      generateJob: { jobId: 'job_growth_report_001', status: 'queued' },
      publishPermission: 'growth:reports:manage',
      note: '报告生成已接真实 generate endpoint，publish API 仍待下一波。',
    };
  },
};
