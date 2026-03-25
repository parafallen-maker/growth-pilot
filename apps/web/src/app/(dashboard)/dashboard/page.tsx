import { EmptyState, ErrorState, LoadingState, MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { ApiClientError } from '@/lib/api-client';
import { dashboardService } from '@/services/dashboard-service';

export default async function DashboardPage() {
  const filters = { campusId: 'campus-guiyang', termId: '2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-24' };

  try {
    const data = await dashboardService.query(filters);
    const hasData = data.metrics.some((item) => item.value !== '0' && item.value !== '¥0.00' && item.value !== '0.0%');

    return (
      <div className="stack">
        <PageHeader
          title="Dashboard 总览"
          description="已切到真实 /analytics/overview。先把数接上，漂亮话以后再写。"
          actions={<><button className="btn primary">切学期</button><button className="btn">导出截图（占位）</button></>}
        />
        <MetricGrid items={data.metrics} />
        {!hasData ? <EmptyState title="当前筛选暂无经营数据" description="可尝试切换校区、学期或日期范围。" action={<button className="btn primary">重置筛选（占位）</button>} /> : null}
        <div className="grid-2">
          <SummaryPanel title="经营摘要" items={data.chartCards} />
          <SummaryPanel title="风险提醒" items={data.tableCards} />
        </div>
        <div className="grid-2">
          <TimelinePanel title="无数据策略" items={[{ title: data.emptyState.name, detail: data.emptyState.detail }]} />
          <TimelinePanel title="实现守门" items={data.governance.map((item) => ({ title: item.name, detail: item.detail }))} />
        </div>
        <LoadingState title="统一四态示例 / Loading" description="页面级加载态已统一到 LoadingState。" />
      </div>
    );
  } catch (error) {
    const apiError = error instanceof ApiClientError ? error : null;

    return (
      <div className="stack">
        <PageHeader title="Dashboard 总览" description="真实接口已接上，但这次它翻车了。" />
        <ErrorState
          title="Dashboard 加载失败"
          description={apiError?.message ?? '暂时无法获取 dashboard 数据。'}
          code={apiError?.code}
          traceId={apiError?.traceId}
          action={<button className="btn danger">刷新重试</button>}
        />
      </div>
    );
  }
}
