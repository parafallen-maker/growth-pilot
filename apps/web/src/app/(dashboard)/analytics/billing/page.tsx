import { ChartPanel, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';
import { CsvExportButton } from '../../_components/csv-export-button';

export default async function AnalyticsBillingPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, analyticsPermissions.billingView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24', sortBy: 'receivableCents', sortOrder: 'desc' as const };
  const result = allowed
    ? await analyticsService.queryBilling(filters).catch(() => null)
    : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Analytics Billing" permissionCode={analyticsPermissions.billingView} />}>
      <div className="stack">
        <PageHeader
          title="收费分析"
          description="收费与财务数据分析"
          actions={<CsvExportButton className="btn primary" label="导出收费分析 CSV" filename="analytics-billing.csv" headers={['指标', '值', '说明']} rows={(result?.metrics ?? []).map((item) => [item.label, item.value, item.hint])} />}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          {result?.charts.length ? result.charts.slice(0, 2).map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="收费趋势图" description="暂无数据" items={[]} />}
        </div>
        <div className="grid-2">
          {result?.charts.length ? result.charts.slice(2).map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="账龄 / 续费漏斗" description="暂无数据" items={[]} />}
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? []} />
        </div>
        <div className="grid-2">
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? []} />
        </div>
      </div>
    </PermissionGuard>
  );
}
