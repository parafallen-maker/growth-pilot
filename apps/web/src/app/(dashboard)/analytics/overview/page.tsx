import { FilterBar, MetricGrid, PageHeader, StateBlock, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { getCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';

export default async function AnalyticsOverviewPage() {
  const currentUser = await getCurrentUser();
  const allowed = hasPermission(currentUser.permissions, analyticsPermissions.overviewView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24' };
  const result = await analyticsService.queryOverview(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Analytics Overview" permissionCode={analyticsPermissions.overviewView} />}>
      <div className="stack">
        <PageHeader
          title="校区总览骨架"
          description={`P26 已铺统一筛选栏、KPI 卡、图表/排行占位与无数据状态。query key: ${JSON.stringify(queryKeys.analyticsOverview(filters))}`}
          actions={<><button className="btn primary">导出总览图（占位）</button><button className="btn">查看口径说明</button></>}
        />
        <MetricGrid items={result.metrics} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          <SummaryPanel title="图表占位" items={result.chartCards} />
          <SummaryPanel title="表格 / 排行占位" items={result.tableCards} />
        </div>
        <div className="grid-3">
          <StateBlock state="loading" title="overview loading" />
          <StateBlock state="empty" title="overview empty" />
          <StateBlock state="error" title="overview error" actionLabel="重试 overview" />
        </div>
        <div className="grid-2">
          <SummaryPanel title="无数据策略" items={[result.emptyState]} />
          <SummaryPanel title="实现守门" items={result.governance} />
        </div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '验收口径', detail: 'overview 看板需支持校区/学期/日期筛选，且无数据不画空图。' }]} />
      </div>
    </PermissionGuard>
  );
}
