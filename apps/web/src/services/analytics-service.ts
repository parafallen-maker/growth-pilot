import type { QueryBase } from '@/features/shared/types';

export type AnalyticsQuery = QueryBase & {
  dateFrom?: string;
  dateTo?: string;
};

type Metric = { label: string; value: string; hint: string };
type SummaryItem = { name: string; detail: string };

type AnalyticsBoard = {
  filters: AnalyticsQuery;
  metrics: Metric[];
  chartCards: SummaryItem[];
  tableCards: SummaryItem[];
  emptyState: SummaryItem;
  governance: SummaryItem[];
};

const toYuan = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

export const analyticsService = {
  queryOverview(params: AnalyticsQuery = {}): AnalyticsBoard {
    return {
      filters: params,
      metrics: [
        { label: '在读学生数', value: '482', hint: '较上周 +18' },
        { label: '作业正确率', value: '91.6%', hint: '按校区/学期可切' },
        { label: '周报完成率', value: '87%', hint: 'P26 口径与 growth reports 对齐' },
        { label: '本月实收', value: toYuan(3685000), hint: 'VO 层 cents -> 元展示' },
      ],
      chartCards: [
        { name: '在读趋势', detail: '折线图占位：按日/周/月看校区在读变化。' },
        { name: '作业正确率趋势', detail: '折线图占位：与 homework review 最终正确率口径对齐。' },
        { name: '周报完成率', detail: '柱线图占位：已发布 / 应发布。' },
        { name: '应收 / 实收', detail: `双轴图占位：${toYuan(4120000)} / ${toYuan(3685000)}。` },
      ],
      tableCards: [
        { name: '今日签到摘要', detail: '排行/表格占位：已签到、未签到、异常签到。' },
        { name: '校区经营排行', detail: '排行占位：按在读、正确率、实收综合排序。' },
      ],
      emptyState: { name: '空状态', detail: '当筛选区间无数据时，仅展示说明与引导，不渲染误导性空图。' },
      governance: [
        { name: 'service 分层', detail: '页面只调 analyticsService.queryOverview，不在页面里直写 fetch。' },
        { name: 'query key', detail: 'analyticsOverview(filters) 与后端 overview 聚合查询一一对应。' },
        { name: '权限守卫', detail: 'overview 仅 super_admin / campus_admin 可见。' },
      ],
    };
  },
  queryTeaching(params: AnalyticsQuery = {}): AnalyticsBoard {
    return {
      filters: params,
      metrics: [
        { label: '待复核作业', value: '36', hint: '老师维度可钻取' },
        { label: '学科平均正确率', value: '89.4%', hint: '数学/英语/语文分布' },
        { label: '高频错因数', value: '12', hint: 'TopN 聚合占位' },
        { label: '观察覆盖率', value: '78%', hint: '按老师/学科联动' },
      ],
      chartCards: [
        { name: '老师待复核排行', detail: '横向柱状图占位：显示老师 backlog。' },
        { name: '学科正确率', detail: '柱状图占位：语数英学科维度对比。' },
        { name: '高频错因 TopN', detail: 'TopN 图占位：错因词典口径复用 homework 模块。' },
        { name: '观察覆盖率趋势', detail: '趋势图占位：growth observations 覆盖率按周看。' },
      ],
      tableCards: [
        { name: '老师表现表', detail: '表格占位：在带学生 / 待复核 / 覆盖率 / 动作。' },
        { name: '问题学科排行', detail: '排行占位：低正确率 + 高频错因联动。' },
      ],
      emptyState: { name: '空状态', detail: '若当前学期无教学数据，展示“先完成作业复核/观察记录后再分析”。' },
      governance: [
        { name: 'service 分层', detail: 'analyticsService.queryTeaching 保留图表/排行/无数据口径。' },
        { name: 'query key', detail: 'analyticsTeaching(filters) 预留给 TanStack Query 接入。' },
        { name: '权限守卫', detail: 'teaching 仅 super_admin / campus_admin 可见。' },
      ],
    };
  },
  queryBilling(params: AnalyticsQuery = {}): AnalyticsBoard {
    return {
      filters: params,
      metrics: [
        { label: '月度应收', value: toYuan(4120000), hint: 'billing contracts / invoices 聚合' },
        { label: '月度实收', value: toYuan(3685000), hint: 'payment posted 后口径一致' },
        { label: '逾期账单', value: '14', hint: '按账龄区间汇总' },
        { label: '续费转化率', value: '61%', hint: '续费漏斗占位' },
      ],
      chartCards: [
        { name: '月度应收 / 实收', detail: `趋势图占位：${toYuan(4120000)} vs ${toYuan(3685000)}。` },
        { name: '账龄分布', detail: '账龄桶占位：0-7 / 8-30 / 31-60 / 60+ 天。' },
        { name: '逾期列表趋势', detail: '折线图占位：逾期账单数量与金额。' },
        { name: '续费漏斗', detail: '漏斗图占位：到期 -> 跟进 -> 报价 -> 付款。' },
      ],
      tableCards: [
        { name: '逾期账单表', detail: '表格占位：家庭 / 学生 / 应收 / 截止日 / 负责人。' },
        { name: '校区回款排行', detail: '排行占位：按校区实收与逾期率排序。' },
      ],
      emptyState: { name: '空状态', detail: '若无账单/支付数据，仅展示金额口径说明与创建账单引导。' },
      governance: [
        { name: 'VO 金额口径', detail: '接口仍传 cents，前端 VO 统一转元；analytics 不直接裸用 cents。' },
        { name: 'query key', detail: 'analyticsBilling(filters) 对应 billing 聚合查询。' },
        { name: '权限守卫', detail: 'billing analytics 含 finance 可见。' },
      ],
    };
  },
};
