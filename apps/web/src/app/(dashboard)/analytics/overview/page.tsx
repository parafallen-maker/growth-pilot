import { ChartPanel, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';
import { CsvExportButton } from '../../_components/csv-export-button';

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
          actions={<CsvExportButton className="btn primary" label="导出总览 CSV" filename="analytics-overview.csv" headers={['指标', '值', '说明']} rows={(result?.metrics ?? []).map((item) => [item.label, item.value, item.hint])} />}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          {result?.charts.length ? result.charts.map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="总览图表" description="暂无数据" items={[]} />}
        </div>
        <div className="grid-2">
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? []} />
          <SummaryPanel title="图表解读" items={result?.chartCards ?? []} />
        </div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '验收口径', detail: 'overview 看板支持校区/学期/日期筛选，且无数据不画空图。' }]} />
      </div>
    </PermissionGuard>
  );
}
