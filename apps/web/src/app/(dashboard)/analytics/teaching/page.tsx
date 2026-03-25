import { FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';

export default async function AnalyticsTeachingPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, analyticsPermissions.teachingView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24', sortBy: 'reviewBacklog', sortOrder: 'desc' as const };
  const result = allowed
    ? await analyticsService.queryTeaching(filters).catch(() => null)
    : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Analytics Teaching" permissionCode={analyticsPermissions.teachingView} />}>
      <div className="stack">
        <PageHeader
          title="教学分析"
          description={`当前展示 analytics/teaching 真实聚合结果。query key: ${JSON.stringify(queryKeys.analyticsTeaching(filters))}`}
          actions={<><button className="btn primary">导出教学分析</button><button className="btn">查看老师维度</button></>}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          <SummaryPanel title="图表解读" items={result?.chartCards ?? [{ name: '教学分析暂不可用', detail: '当前改为降级展示，避免页面 SSR 直接失败。' }]} />
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? [{ name: '数据说明', detail: '当前未取到 teaching 聚合结果，可稍后刷新重试。' }]} />
        </div>
        <div className="grid-2">
          <SummaryPanel title="无数据策略" items={[result?.emptyState ?? { name: '降级策略', detail: '保留摘要说明与筛选条件，避免页面 SSR 直接失败。' }]} />
          <SummaryPanel title="实现守门" items={result?.governance ?? [{ name: 'SSR fallback', detail: 'analytics/teaching fetch 失败时返回稳定页面。' }]} />
        </div>
        <SummaryPanel title="导出与验收提示" items={[{ name: '图表导出', detail: analyticsChartExportHint }, { name: '验收口径', detail: 'teaching 看板展示老师/学科/错因/覆盖率，且无数据不画空图。' }]} />
      </div>
    </PermissionGuard>
  );
}
