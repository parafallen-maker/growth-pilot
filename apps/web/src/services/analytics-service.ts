import { apiRequest } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase } from '@/features/shared/types';
import type { TeacherWorkbench } from '@growthpilot/schema';

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
    const auth = await getAuthTokens();
    const result = await apiRequest<{
      activeStudentCount: number;
      pendingHomeworkCount: number;
      reportPublishRate: number;
      receivableCents: number;
      receivedCents: number;
      todayAttendanceAnomalyCount: number;
      trend: { receivableCents: number; receivedCents: number; renewalTodoCount: number; communicationTouchCount: number; messageFailureCount: number };
    }>(`/analytics/overview${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    return {
      filters: params,
      metrics: [
        { label: '在读学生数', value: String(result.activeStudentCount) },
        { label: '待复核作业', value: String(result.pendingHomeworkCount) },
        { label: '周报完成率', value: `${(result.reportPublishRate * 100).toFixed(1)}%` },
        { label: '本月实收', value: toYuan(result.receivedCents) },
      ],
      charts: [
        {
          title: '经营金额对比',
          
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
            { label: '消息失败', value: result.trend.messageFailureCount, valueLabel: `${result.trend.messageFailureCount} 条`, tone: 'danger' },
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
      governance: [],
      emptyState: { name: '空状态', detail: '当筛选区间无数据时,仅展示说明与引导,不渲染误导性空图。' },
    };
  },

  async queryTeaching(params: AnalyticsQuery = {}): Promise<AnalyticsBoard> {
    const auth = await getAuthTokens();
    const result = await apiRequest<{
      teacherWorkloads: Array<{ teacherId: string; teacherName: string; pendingReviewCount: number; activeStudentCount: number; communicationCount: number }>;
      subjectAccuracy: Array<{ subject: string; avgAccuracyPct: number; sampleCount: number }>;
      topErrors: Array<{ label: string; count: number }>;
      growthCoverage: Array<{ subject: string; totalMinutes: number; sessionCount: number }>;
      dataSource: { homeworkSubmissionCount: number; communicationRecordCount: number; homeworkDailyStatCount: number; mode: string };
    }>(`/analytics/teaching${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    return {
      filters: params,
      metrics: [
        { label: '待复核作业', value: String(result.teacherWorkloads.reduce((sum, item) => sum + item.pendingReviewCount, 0)) },
        { label: '学科平均正确率', value: result.subjectAccuracy[0] ? `${result.subjectAccuracy[0].avgAccuracyPct}%` : '--' },
        { label: '高频错因数', value: String(result.topErrors.length) },
        { label: '观察覆盖项', value: String(result.growthCoverage.length) },
      ],
      charts: [
        {
          title: '学科正确率',
          description: '各学科平均正确率',
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
      governance: [],
      emptyState: { name: '空状态', detail: '若当前学期无教学数据,展示"先完成作业复核/观察记录后再分析"。' },
    };
  },

  async queryTeacherWorkbench(params: AnalyticsQuery & { teacherId?: string } = {}): Promise<TeacherWorkbench> {
    const auth = await getAuthTokens();
    return apiRequest<TeacherWorkbench>(`/analytics/teacher-workbench${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async queryBilling(params: AnalyticsQuery = {}): Promise<AnalyticsBoard> {
    const auth = await getAuthTokens();
    const result = await apiRequest<{
      receivableTrend: Array<{ date: string; amountCents: number }>;
      receivedTrend: Array<{ date: string; amountCents: number }>;
      agingSummary: Array<{ bucket: string; invoiceCount: number; outstandingCents: number }>;
      renewalFunnel: Array<{ status: string; count: number }>;
      contractCount: number;
      communicationTouchCount: number;
      messageTaskCount: number;
    }>(`/analytics/billing${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    const receivableTotal = result.receivableTrend.reduce((sum, item) => sum + item.amountCents, 0);
    const receivedTotal = result.receivedTrend.reduce((sum, item) => sum + item.amountCents, 0);
    const outstanding = result.agingSummary.reduce((sum, item) => sum + item.outstandingCents, 0);

    return {
      filters: params,
      metrics: [
        { label: '月度应收', value: toYuan(receivableTotal) },
        { label: '月度实收', value: toYuan(receivedTotal) },
        { label: '逾期账单', value: String(result.agingSummary.reduce((sum, item) => sum + item.invoiceCount, 0)), hint: '按账龄桶汇总' },
        { label: '续费机会', value: String(result.renewalFunnel.reduce((sum, item) => sum + item.count, 0)) },
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
            detail: '按续费阶段分组',
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
      governance: [],
      emptyState: { name: '空状态', detail: '若无账单/支付数据，仅展示创建账单引导。' },
    };
  },
};
