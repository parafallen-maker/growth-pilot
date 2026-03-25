import { MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { dashboardService } from '@/services/dashboard-service';

export default async function DashboardPage() {
  const data = await dashboardService.query({ campusId: 'campus-guiyang', termId: '2026-spring' });

  return (
    <div className="stack">
      <PageHeader
        title="Dashboard 总览"
        description="真实数据来自 GET /analytics/overview。指标说话，比口号靠谱。"
        actions={<><button className="btn primary">切学期</button><button className="btn">导出截图</button></>}
      />
      <MetricGrid items={data.metrics} />
      <div className="grid-2">
        <SummaryPanel title="经营趋势" items={data.chartCards} />
        <SummaryPanel title="运营摘要" items={data.tableCards} />
      </div>
      <div className="grid-2">
        <TimelinePanel title="治理提示" items={data.governance.map((item) => ({ title: item.name, detail: item.detail }))} />
        <TimelinePanel title="空状态策略" items={[{ title: data.emptyState.name, detail: data.emptyState.detail }]} />
      </div>
    </div>
  );
}
