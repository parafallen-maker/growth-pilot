import { FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';

type GrowthReportsResult = Awaited<ReturnType<typeof growthService.queryReports>>;

function ReportListSection({ title, items }: { title: string; items: GrowthReportsResult['queued'] }) {
  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h3>{title}</h3>
          <p>真实 reports 数据按状态分组展示。</p>
        </div>
        <button className="btn">批量处理</button>
      </div>
      {items.map((item) => (
        <article key={item.reportId} className="selection-card active-card">
          <div className="page-header" style={{ marginBottom: 8 }}>
            <strong>{item.studentName} · {item.reportType}</strong>
            <span className="badge">{item.status}</span>
          </div>
          <div className="subtle">{item.period} · owner: {item.owner}</div>
          <div className="subtle">{item.actionHint}</div>
        </article>
      ))}
    </section>
  );
}

export default async function GrowthReportsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, growthPermissions.reportsView);
  const result = await growthService.queryReports({ pageNo: 1, pageSize: 20, reportType: 'weekly', publishStatus: 'all' });
  const action = growthService.actionReport();

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长报告" permissionCode={growthPermissions.reportsView} />}>
      <div className="stack">
        <PageHeader
          title="成长报告"
          description={`真实 reports 列表已接：${JSON.stringify(queryKeys.growthReports({ pageNo: 1, pageSize: 20, reportType: 'weekly' }))}`}
          actions={<><button className="btn primary">生成草稿</button><button className="btn">打开预览</button><button className="btn">发布设置</button></>}
        />
        <FilterBar fields={[
          { label: '报告类型', value: '周报', kind: 'select' },
          { label: '学期', value: '2026 春季', kind: 'select' },
          { label: '周 / 月', value: '2026 W12' },
          { label: '校区', value: '全部校区', kind: 'select' },
          { label: '老师', value: '全部老师', kind: 'select' },
          { label: '发布状态', value: '全部', kind: 'select' },
        ]} />
        <div className="grid-3">
          <ReportListSection title="待生成" items={result.queued} />
          <ReportListSection title="草稿 / 已复核" items={result.drafts} />
          <ReportListSection title="已发布" items={result.published} />
        </div>
        <div className="report-workbench-layout">
          <section className="panel stack">
            <div className="page-header"><h3>素材池</h3><span className="badge">traceable sources</span></div>
            <SummaryPanel title="素材来源" items={result.editor.materialPool} />
          </section>
          <section className="panel stack">
            <div className="page-header"><h3>正文 / 详情预览</h3><span className="badge">real detail</span></div>
            {result.editor.draftSections.map((item) => (
              <article key={item.title} className="selection-card">
                <strong>{item.title}</strong>
                <div className="subtle" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{item.detail}</div>
              </article>
            ))}
          </section>
          <section className="panel stack">
            <div className="page-header"><h3>发布设置</h3><span className="badge success">API ready</span></div>
            <SummaryPanel title="发布规则" items={result.editor.publishSettings} />
            <article className="selection-card">
              <strong>动作约定</strong>
              <div className="subtle" style={{ marginTop: 8 }}>{action.note}</div>
              <div className="subtle" style={{ marginTop: 8 }}>generate: {action.generateEndpoint} / review: {action.reviewEndpoint} / publish: {action.publishEndpoint}</div>
              <div className="button-row" style={{ marginTop: 12 }}>
                <button className="btn">保存草稿</button>
                <button className="btn">预览报告</button>
                <button className="btn primary">确认发布</button>
              </div>
            </article>
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
