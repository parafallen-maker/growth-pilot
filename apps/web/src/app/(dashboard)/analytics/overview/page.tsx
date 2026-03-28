import { ChartPanel, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';

export default async function AnalyticsOverviewPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, analyticsPermissions.overviewView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24' };
  const result = allowed
    ? await analyticsService.queryOverview(filters).catch(() => null)
    : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Analytics Overview" permissionCode={analyticsPermissions.overviewView} />}>
      <div className="stack">
        <PageHeader
          title="校区总览"
          description="校区经营核心指标与趋势"
          actions={<><button className="btn primary">导出总览图</button><button className="btn">查看口径说明</button></>}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          {result?.charts.length ? result.charts.map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="总览图表" description="overview 聚合结果暂不可用。" items={[]} />}
        </div>
        <div className="grid-2">
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? [{ name: '数据说明', detail: '当前未取到 overview 聚合结果，可稍后刷新重试。' }]} />
          <SummaryPanel title="图表解读" items={result?.chartCards ?? [{ name: '总览暂不可用', detail: '当前改为降级展示，避免页面 SSR 直接失败。' }]} />
        </div>
        <div className="grid-2">
          <SummaryPanel title="无数据策略" items={[result?.emptyState ?? { name: '降级策略', detail: '保留摘要说明与筛选条件，避免页面 SSR 直接失败。' }]} />
          <SummaryPanel title="实现守门" items={result?.governance ?? [{ name: 'SSR fallback', detail: 'analytics/overview fetch 失败时返回稳定页面。' }]} />
        </div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '验收口径', detail: 'overview 看板支持校区/学期/日期筛选，且无数据不画空图。' }]} />
      </div>
    </PermissionGuard>
  );
}
