import { ChartPanel, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { analyticsChartExportHint, analyticsPermissions } from '@/features/analytics/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { analyticsService } from '@/services/analytics-service';
import { CsvExportButton } from '../../_components/csv-export-button';

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
          description="教师工作量与教学质量分析"
          actions={<><CsvExportButton className="btn primary" label="导出教学分析 CSV" filename="analytics-teaching.csv" headers={['指标', '值', '说明']} rows={(result?.metrics ?? []).map((item) => [item.label, item.value, item.hint])} /><a className="btn" href="#teaching-ranking">查看老师维度</a></>}
        />
        <MetricGrid items={result?.metrics ?? []} />
        <FilterBar fields={[{ label: '校区', value: '贵阳主校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '日期', value: '2026-03-01 ~ 2026-03-24' }]} />
        <div className="grid-2">
          {result?.charts.length ? result.charts.slice(0, 2).map((chart) => (
            <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />
          )) : <ChartPanel title="教学图表" description="暂无数据" items={[]} />}
        </div>
        <div className="grid-2" id="teaching-ranking">
          {result?.charts[2] ? <ChartPanel title={result.charts[2].title} description={result.charts[2].description} items={result.charts[2].items} /> : <ChartPanel title="高频错因 TopN" description="暂无数据" items={[]} />}
          <SummaryPanel title="排行 / 摘要" items={result?.tableCards ?? []} />
        </div>
      </div>
    </PermissionGuard>
  );
}
