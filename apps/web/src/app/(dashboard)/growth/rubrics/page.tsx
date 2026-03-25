import { PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';

export default async function GrowthRubricsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, growthPermissions.rubricsView);
  const result = await growthService.queryRubrics({ pageNo: 1, pageSize: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
  const detail = await growthService.detailRubric(result.list[0]?.rubricId ?? 'rubric-weekly-core');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Rubric 模板" permissionCode={growthPermissions.rubricsView} />}>
      <div className="stack">
        <PageHeader
          title="Rubric 模板"
          description={`真实列表 + detail 已接：${JSON.stringify(queryKeys.growthRubrics({ pageNo: 1, pageSize: 20 }))}`}
          actions={<><button className="btn primary">新建模板</button><button className="btn">复制模板</button><button className="btn">发布版本</button></>}
        />
        <div className="grid-growth-rubric">
          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>模板列表</h3>
                <p>当前直接展示真实 rubric template 数据。</p>
              </div>
              <span className="badge">{result.page.total} templates</span>
            </div>
            {result.list.map((item) => (
              <article key={item.rubricId} className="selection-card active-card">
                <div className="page-header" style={{ marginBottom: 8 }}>
                  <strong>{item.name}</strong>
                  <span className={`badge${item.status === 'active' ? ' success' : ''}`}>{item.status}</span>
                </div>
                <div className="subtle">{item.scope} · {item.version} · 维度 {item.dimensions} 个</div>
                <div className="subtle">更新于 {item.updatedAt}</div>
              </article>
            ))}
          </section>

          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>维度详情</h3>
                <p>{detail.editorNotice}</p>
              </div>
              <div className="button-row">
                <button className="btn">新增维度</button>
                <button className="btn primary">保存草稿</button>
              </div>
            </div>
            {detail.dimensions.map((dimension) => (
              <article key={dimension.code} className="selection-card">
                <div className="page-header" style={{ marginBottom: 8 }}>
                  <strong>{dimension.name}</strong>
                  <span className="badge">{dimension.code}</span>
                </div>
                <div className="form-grid">
                  <div className="field"><label>权重</label><input className="input" defaultValue={String(dimension.weight)} /></div>
                  <div className="field"><label>分值范围</label><input className="input" defaultValue={dimension.scoreRange} /></div>
                  <div className="field form-span-2"><label>描述</label><textarea className="textarea" defaultValue={dimension.description} /></div>
                  <div className="field"><label>排序</label><input className="input" defaultValue={String(dimension.sort)} /></div>
                  <div className="field"><label>状态提示</label><input className="input" defaultValue="detail 真接口 / 保存待接" /></div>
                </div>
              </article>
            ))}
            <SummaryPanel title="接线备注" items={[
              { name: 'service 分层', detail: 'queryRubrics / detailRubric 均走真实接口。' },
              { name: '协议约定', detail: '模板编辑提交仍待后续接 POST /growth/rubrics。' },
              { name: '权限', detail: `查看 ${growthPermissions.rubricsView}，编辑 ${growthPermissions.rubricsManage}` },
            ]} />
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
