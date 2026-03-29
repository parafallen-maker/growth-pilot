import { ChartPanel, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { queryKeys } from '@/features/shared/query-keys';
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
          actions={<><CsvExportButton className="btn primary" label="导出收费分析 CSV" filename="analytics-billing.csv" headers={['指标', '值', '说明']} rows={(result?.metrics ?? []).map((item) => [item.label, item.value, item.hint])} /><a className="btn" href="#billing-governance">查看金额口径</a></>}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          {result?.charts.length ? result.charts.slice(0, 2).map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="收费趋势图" description="billing 聚合结果暂不可用。" items={[]} />}
        </div>
        <div className="grid-2">
          {result?.charts.length ? result.charts.slice(2).map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="账龄 / 续费漏斗" description="billing 聚合结果暂不可用。" items={[]} />}
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? [{ name: '数据说明', detail: '当前未取到 billing 聚合结果，可稍后刷新重试。' }]} />
        </div>
        <div className="grid-2">
          <SummaryPanel title="图表解读" items={result?.chartCards ?? [{ name: '收费分析暂不可用', detail: '当前改为降级展示，避免页面 SSR 直接失败。' }]} />
          <SummaryPanel title="无数据策略" items={[result?.emptyState ?? { name: '降级策略', detail: '保留摘要说明与筛选条件，避免页面 SSR 直接失败。' }]} />
        </div>
        <div id="billing-governance"><SummaryPanel title="实现守门" items={result?.governance ?? [{ name: 'SSR fallback', detail: 'analytics/billing fetch 失败时返回稳定页面。' }]} /></div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '金额显示', detail: '页面展示统一为元，接口传输仍保持 cents。' }]} />
      </div>
    </PermissionGuard>
  );
}
