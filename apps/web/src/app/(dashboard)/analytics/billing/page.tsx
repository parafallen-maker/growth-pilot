import { FilterBar, MetricGrid, PageHeader, StateBlock, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';

export default async function AnalyticsBillingPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, analyticsPermissions.billingView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24', sortBy: 'receivableCents', sortOrder: 'desc' as const };
  const result = await analyticsService.queryBilling(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Analytics Billing" permissionCode={analyticsPermissions.billingView} />}>
      <div className="stack">
        <PageHeader
          title="收费分析"
          description={`P28 已切到 analytics/billing 真聚合，页面按元展示金额。query key: ${JSON.stringify(queryKeys.analyticsBilling(filters))}`}
          actions={<><button className="btn primary">导出收费分析</button><button className="btn">查看金额口径</button></>}
        />
        <MetricGrid items={result.metrics} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          <SummaryPanel title="图表解读" items={result.chartCards} />
          <SummaryPanel title="排行 / 摘要" items={result.tableCards} />
        </div>
        <div className="grid-3">
          <StateBlock state="loading" title="billing analytics loading" />
          <StateBlock state="empty" title="billing analytics empty" />
          <StateBlock state="error" title="billing analytics error" actionLabel="重试 billing analytics" />
        </div>
        <div className="grid-2">
          <SummaryPanel title="无数据策略" items={[result.emptyState]} />
          <SummaryPanel title="实现守门" items={result.governance} />
        </div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '金额显示', detail: '页面展示统一为元，接口传输仍保持 cents。' }]} />
      </div>
    </PermissionGuard>
  );
}
