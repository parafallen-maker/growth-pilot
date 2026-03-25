import { FilterBar, MetricGrid, PageHeader } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';

export default async function GrowthObservationsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, growthPermissions.observationsView);
  const result = await growthService.queryObservations({ pageNo: 1, pageSize: 20, scene: 'all', reportPublished: 'all', sortBy: 'observedAt', sortOrder: 'desc' });
  const createMeta = growthService.createObservation();
  const publishedCount = result.list.filter((item) => item.reportPublished === '已纳入').length;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长观察" permissionCode={growthPermissions.observationsView} />}>
      <div className="stack">
        <PageHeader
          title="成长观察"
          description={`真实列表接口已接：${JSON.stringify(queryKeys.growthObservations({ pageNo: 1, pageSize: 20, scene: 'all' }))}`}
          actions={<><button className="btn primary">新建观察</button><button className="btn">导出</button><button className="btn">动态 schema 预览</button></>}
        />
        <MetricGrid items={[
          { label: '当前页观察', value: String(result.list.length), hint: `total ${result.page.total}` },
          { label: '已纳入报告', value: String(publishedCount), hint: 'publishToFamily=true' },
          { label: '待纳入报告', value: String(result.list.length - publishedCount), hint: '仍可进入报告素材池' },
          { label: '创建接口', value: 'POST ready', hint: createMeta.idempotencyHint },
        ]} />
        <FilterBar fields={[
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '老师', value: '全部老师', kind: 'select' },
          { label: '日期范围', value: '2026-03-01 ~ 2026-03-24' },
          { label: '场景', value: '全部场景', kind: 'select' },
          { label: '报告状态', value: '全部', kind: 'select' },
        ]} />
        <section className="panel stack">
          <div className="page-header">
            <div>
              <h3>观察列表</h3>
              <p>{createMeta.idempotencyHint}</p>
            </div>
            <span className="badge">create / filter / export</span>
          </div>
          <div className="table-card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>日期</th><th>学生</th><th>老师</th><th>场景</th><th>总分</th><th>报告纳入</th><th>状态</th></tr>
              </thead>
              <tbody>
                {result.list.map((item) => (
                  <tr key={item.observationId}>
                    <td>{item.observedAt}</td><td>{item.studentName}</td><td>{item.teacherName}</td><td>{item.scene}</td><td>{item.totalScore}</td><td>{item.reportPublished}</td><td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PermissionGuard>
  );
}
