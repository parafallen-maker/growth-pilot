import { apiRequest } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';

export type AnalyticsQuery = QueryBase & {
  dateFrom?: string;
  dateTo?: string;
};

type Metric = { label: string; value: string; hint: string };
type SummaryItem = { name: string; detail: string };
type ChartItem = {
  label: string;
  value: number;
  detail: string;
  valueLabel?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
};
type ChartGroup = {
  title: string;
  description: string;
  items: ChartItem[];
};

type AnalyticsBoard = {
  filters: AnalyticsQuery;
  metrics: Metric[];
  charts: ChartGroup[];
  chartCards: SummaryItem[];
  tableCards: SummaryItem[];
  emptyState: SummaryItem;
  governance: SummaryItem[];
};

const toYuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const analyticsService = {
  async queryOverview(params: AnalyticsQuery = {}): Promise<AnalyticsBoard> {
    const result = await apiRequest<{
      activeStudentCount: number;
      pendingHomeworkCount: number;
      reportPublishRate: number;
      receivableCents: number;
      receivedCents: number;
      todayAttendanceAnomalyCount: number;
      trend: { receivableCents: number; receivedCents: number; renewalTodoCount: number; communicationTouchCount: number; messageFailureCount: number };
    }>(`/analytics/overview${buildQuery(params)}`);

    return {
      filters: params,
      metrics: [
        { label: '在读学生数', value: String(result.activeStudentCount), hint: '来自 contracts active student 聚合' },
        { label: '待复核作业', value: String(result.pendingHomeworkCount), hint: '来自 homework reviewStatus 聚合' },
        { label: '周报完成率', value: `${(result.reportPublishRate * 100).toFixed(1)}%`, hint: '当前口径仍基于 homework reviewed/published 比率' },
        { label: '本月实收', value: toYuan(result.receivedCents), hint: 'VO 层 cents -> 元展示' },
      ],
      charts: [
        {
          title: '经营金额对比',
          description: '来自 overview trend 的应收 / 实收聚合。',
          items: [
            { label: '应收', value: result.trend.receivableCents, valueLabel: toYuan(result.trend.receivableCents), detail: '当前筛选窗口应收总额', tone: 'warning' },
            { label: '实收', value: result.trend.receivedCents, valueLabel: toYuan(result.trend.receivedCents), detail: '当前筛选窗口已收总额', tone: 'success' },
          ],
        },
        {
          title: '续费与触达',
          description: '把待办、触达、失败消息转成事件量图。',
          items: [
            { label: '续费待跟进', value: result.trend.renewalTodoCount, valueLabel: `${result.trend.renewalTodoCount} 条`, detail: '当前需要继续跟进的续费机会', tone: 'brand' },
            { label: '沟通触达', value: result.trend.communicationTouchCount, valueLabel: `${result.trend.communicationTouchCount} 次`, detail: '沟通记录触达次数', tone: 'success' },
            { label: '消息失败', value: result.trend.messageFailureCount, valueLabel: `${result.trend.messageFailureCount} 条`, detail: 'message_tasks 失败条数', tone: 'danger' },
            { label: '签到异常', value: result.todayAttendanceAnomalyCount, valueLabel: `${result.todayAttendanceAnomalyCount} 条`, detail: '今日出勤异常数', tone: 'warning' },
          ],
        },
      ],
      chartCards: [
        { name: '应收 / 实收', detail: `${toYuan(result.trend.receivableCents)} / ${toYuan(result.trend.receivedCents)}` },
        { name: '续费待跟进', detail: `${result.trend.renewalTodoCount} 条` },
        { name: '沟通触达', detail: `${result.trend.communicationTouchCount} 次` },
        { name: '消息失败', detail: `${result.trend.messageFailureCount} 条` },
      ],
      tableCards: [
        { name: '今日签到异常', detail: `${result.todayAttendanceAnomalyCount} 条` },
        { name: '经营摘要', detail: `应收 ${toYuan(result.receivableCents)} / 实收 ${toYuan(result.receivedCents)}` },
      ],
      emptyState: { name: '空状态', detail: '当筛选区间无数据时，仅展示说明与引导，不渲染误导性空图。' },
      governance: [
        { name: 'service 分层', detail: '页面只调 analyticsService.queryOverview，不在页面里直写 fetch。' },
        { name: 'query key', detail: 'analyticsOverview(filters) 与后端 overview 聚合查询一一对应。' },
        { name: '权限守卫', detail: 'overview 仅 super_admin / campus_admin 可见。' },
      ],
    };
  },

  async queryTeaching(params: AnalyticsQuery = {}): Promise<AnalyticsBoard> {
    const result = await apiRequest<{
      teacherWorkloads: Array<{ teacherId: string; teacherName: string; pendingReviewCount: number; activeStudentCount: number; communicationCount: number }>;
      subjectAccuracy: Array<{ subject: string; avgAccuracyPct: number; sampleCount: number }>;
      topErrors: Array<{ label: string; count: number }>;
      growthCoverage: Array<{ subject: string; totalMinutes: number; sessionCount: number }>;
      dataSource: { homeworkSubmissionCount: number; communicationRecordCount: number; homeworkDailyStatCount: number; mode: string };
    }>(`/analytics/teaching${buildQuery(params)}`);

    return {
      filters: params,
      metrics: [
        { label: '待复核作业', value: String(result.teacherWorkloads.reduce((sum, item) => sum + item.pendingReviewCount, 0)), hint: '老师维度真实聚合' },
        { label: '学科平均正确率', value: result.subjectAccuracy[0] ? `${result.subjectAccuracy[0].avgAccuracyPct}%` : '--', hint: '当前展示首个学科样本' },
        { label: '高频错因数', value: String(result.topErrors.length), hint: 'TopN 聚合来自最终错因摘要' },
        { label: '观察覆盖项', value: String(result.growthCoverage.length), hint: 'homework daily stats 聚合' },
      ],
      charts: [
        {
          title: '学科正确率',
          description: '按学科展示真实平均正确率。',
          items: result.subjectAccuracy.map((item) => ({
            label: item.subject,
            value: item.avgAccuracyPct,
            valueLabel: `${item.avgAccuracyPct}%`,
            detail: `样本 ${item.sampleCount}`,
            tone: 'brand',
          })),
        },
        {
          title: '老师待复核负载',
          description: '按老师展示当前 review backlog。',
          items: result.teacherWorkloads.map((item) => ({
            label: item.teacherName,
            value: item.pendingReviewCount,
            valueLabel: `${item.pendingReviewCount} 条`,
            detail: `在带 ${item.activeStudentCount} / 沟通 ${item.communicationCount}`,
            tone: 'warning',
          })),
        },
        {
          title: '高频错因 TopN',
          description: '来自最终错因摘要聚合。',
          items: result.topErrors.map((item) => ({
            label: item.label,
            value: item.count,
            valueLabel: `${item.count} 次`,
            detail: '可作为教研复盘输入',
            tone: 'danger',
          })),
        },
      ],
      chartCards: result.subjectAccuracy.map((item) => ({ name: `${item.subject} 正确率`, detail: `${item.avgAccuracyPct}% / sample ${item.sampleCount}` })),
      tableCards: [
        ...result.teacherWorkloads.map((item) => ({ name: item.teacherName, detail: `待复核 ${item.pendingReviewCount} / 在带 ${item.activeStudentCount} / 沟通 ${item.communicationCount}` })),
        { name: '数据源', detail: `${result.dataSource.mode} / HW ${result.dataSource.homeworkSubmissionCount}` },
      ],
      emptyState: { name: '空状态', detail: '若当前学期无教学数据，展示“先完成作业复核/观察记录后再分析”。' },
      governance: [
        { name: 'service 分层', detail: 'analyticsService.queryTeaching 保留图表/排行/无数据口径。' },
        { name: 'query key', detail: 'analyticsTeaching(filters) 预留给 TanStack Query 接入。' },
        { name: '权限守卫', detail: 'teaching 仅 super_admin / campus_admin 可见。' },
      ],
    };
  },

  async queryBilling(params: AnalyticsQuery = {}): Promise<AnalyticsBoard> {
    const result = await apiRequest<{
      receivableTrend: Array<{ date: string; amountCents: number }>;
      receivedTrend: Array<{ date: string; amountCents: number }>;
      agingSummary: Array<{ bucket: string; invoiceCount: number; outstandingCents: number }>;
      renewalFunnel: Array<{ status: string; count: number }>;
      contractCount: number;
      communicationTouchCount: number;
      messageTaskCount: number;
    }>(`/analytics/billing${buildQuery(params)}`);

    const receivableTotal = result.receivableTrend.reduce((sum, item) => sum + item.amountCents, 0);
    const receivedTotal = result.receivedTrend.reduce((sum, item) => sum + item.amountCents, 0);
    const outstanding = result.agingSummary.reduce((sum, item) => sum + item.outstandingCents, 0);

    return {
      filters: params,
      metrics: [
        { label: '月度应收', value: toYuan(receivableTotal), hint: 'billing contracts / invoices 聚合' },
        { label: '月度实收', value: toYuan(receivedTotal), hint: 'payment success 聚合' },
        { label: '逾期账单', value: String(result.agingSummary.reduce((sum, item) => sum + item.invoiceCount, 0)), hint: '按账龄桶汇总' },
        { label: '续费机会', value: String(result.renewalFunnel.reduce((sum, item) => sum + item.count, 0)), hint: '续费 funnel 聚合' },
      ],
      charts: [
        {
          title: '日应收趋势',
          description: '来自 billing analytics 的 receivableTrend。',
          items: result.receivableTrend.map((item) => ({
            label: item.date,
            value: item.amountCents,
            valueLabel: toYuan(item.amountCents),
            detail: '当日应收',
            tone: 'warning',
          })),
        },
        {
          title: '日实收趋势',
          description: '来自 billing analytics 的 receivedTrend。',
          items: result.receivedTrend.map((item) => ({
            label: item.date,
            value: item.amountCents,
            valueLabel: toYuan(item.amountCents),
            detail: '当日实收',
            tone: 'success',
          })),
        },
        {
          title: '账龄余额',
          description: '按账龄桶展示 outstanding balance。',
          items: result.agingSummary.map((item) => ({
            label: item.bucket,
            value: item.outstandingCents,
            valueLabel: toYuan(item.outstandingCents),
            detail: `${item.invoiceCount} 张账单`,
            tone: 'danger',
          })),
        },
        {
          title: '续费漏斗',
          description: '按续费状态展示机会分布。',
          items: result.renewalFunnel.map((item) => ({
            label: item.status,
            value: item.count,
            valueLabel: `${item.count} 条`,
            detail: 'renewal status 聚合',
            tone: 'brand',
          })),
        },
      ],
      chartCards: [
        { name: '月度应收 / 实收', detail: `${toYuan(receivableTotal)} vs ${toYuan(receivedTotal)}` },
        { name: '未收余额', detail: toYuan(outstanding) },
        { name: '沟通触达', detail: `${result.communicationTouchCount} 次` },
        { name: '消息任务', detail: `${result.messageTaskCount} 条` },
      ],
      tableCards: result.renewalFunnel.map((item) => ({ name: `续费 ${item.status}`, detail: `${item.count} 条` })),
      emptyState: { name: '空状态', detail: '若无账单/支付数据，仅展示金额口径说明与创建账单引导。' },
      governance: [
        { name: 'VO 金额口径', detail: '接口仍传 cents，前端 VO 统一转元；analytics 不直接裸用 cents。' },
        { name: 'query key', detail: 'analyticsBilling(filters) 对应 billing 聚合查询。' },
        { name: '权限守卫', detail: 'billing analytics 含 finance 可见。' },
      ],
    };
  },
};
