import { PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';
import { createGrowthRubric } from '../actions';

const dimensionSlots = [1, 2, 3] as const;

export default async function GrowthRubricsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string; templateId?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, growthPermissions.rubricsView);
  const result = await growthService.queryRubrics({ pageNo: 1, pageSize: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
  const selectedTemplateId = result.list.find((item) => item.rubricId === query?.templateId)?.rubricId ?? result.list[0]?.rubricId ?? '';
  const detail = selectedTemplateId ? await growthService.detailRubric(selectedTemplateId) : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="Rubric 模板" permissionCode={growthPermissions.rubricsView} />}>
      <div className="stack">
        <PageHeader
          title="Rubric 模板"
          description="习惯观察评价维度模板管理"
          actions={<><a className="btn primary" href="#rubric-create-form">新建模板</a><a className="btn" href="#rubric-detail-panel">查看详情</a><button className="btn">发布版本</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">Rubric 模板已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <div className="grid-growth-rubric">
          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>模板列表</h3>
                <p>当前评价模板与维度配置。</p>
              </div>
              <span className="badge">{result.page.total} templates</span>
            </div>
            <form className="form-grid" method="get" id="rubric-detail-panel">
              <div className="field form-span-2">
                <label>切换模板详情</label>
                <select className="select" name="templateId" defaultValue={selectedTemplateId}>
                  {result.list.map((item) => (
                    <option key={item.rubricId} value={item.rubricId}>
                      {item.name} / {item.scope} / {item.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="button-row form-span-2"><button className="btn" type="submit">加载详情</button></div>
            </form>
            {result.list.map((item) => (
              <article key={item.rubricId} className={`selection-card${item.rubricId === selectedTemplateId ? ' active-card' : ''}`}>
                <div className="page-header" style={{ marginBottom: 8 }}>
                  <strong>{item.name}</strong>
                  <span className={`badge${item.status === 'active' ? ' success' : ''}`}>{item.status}</span>
                </div>
                <div className="subtle">{item.scope} · {item.version} · 维度 {item.dimensions} 个</div>
                <div className="subtle">更新于 {item.updatedAt}</div>
              </article>
            ))}
          </section>

          <section className="panel stack" id="rubric-create-form">
            <div className="page-header">
              <div>
                <h3>新建模板</h3>
                <p>创建新的评价模板，配置评分维度与权重。</p>
              </div>
              <span className="badge success">POST /growth/rubrics</span>
            </div>
            <form className="form-grid" action={createGrowthRubric}>
              <div className="field"><label>模板名称</label><input className="input" name="name" placeholder="例如：课堂成长观察模板" required /></div>
              <div className="field"><label>适用范围</label><input className="input" name="stageScope" defaultValue="general" required /></div>
              <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder="campus-guanshanhu" /></div>
              <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="term-2026-spring" /></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="draft">draft</option><option value="inactive">inactive</option></select></div>
              <div className="field form-span-2"><label>说明</label><textarea className="textarea" name="description" placeholder="用于课堂参与、作业习惯、家校反馈等多维度观察。" /></div>
              <div className="field form-span-2">
                <label>维度定义（最多 3 条）</label>
                <div className="stack">
                  {dimensionSlots.map((slot) => (
                    <article key={slot} className="selection-card">
                      <div className="page-header" style={{ marginBottom: 12 }}>
                        <strong>维度 {slot}</strong>
                        <span className={`badge${slot === 1 ? ' success' : ''}`}>{slot === 1 ? '至少 1 条必填' : '可选'}</span>
                      </div>
                      <div className="form-grid">
                        <div className="field"><label>编码</label><input className="input" name={`dimensionCode_${slot}`} placeholder={slot === 1 ? 'focus' : 'expression / homework'} required={slot === 1} /></div>
                        <div className="field"><label>名称</label><input className="input" name={`dimensionName_${slot}`} placeholder={slot === 1 ? '专注度' : '可选维度名称'} required={slot === 1} /></div>
                        <div className="field"><label>权重</label><input className="input" type="number" step="0.1" min="0" name={`dimensionWeight_${slot}`} defaultValue="1" /></div>
                        <div className="field"><label>评分范围</label><div className="button-row"><input className="input" type="number" min="0" name={`dimensionScoreMin_${slot}`} defaultValue="1" /><input className="input" type="number" min="1" name={`dimensionScoreMax_${slot}`} defaultValue="5" /></div></div>
                        <div className="field form-span-2"><label>描述</label><textarea className="textarea" name={`dimensionDescription_${slot}`} placeholder="描述评分标准或观察重点。" /></div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit">创建模板</button></div>
            </form>
            {detail ? (
              <>
                <SummaryPanel title="当前模板" items={[
                  { name: '模板名称', detail: detail.name },
                  { name: '状态', detail: detail.status },
                  { name: 'schemaVersion', detail: detail.schemaVersion },
                  { name: '说明', detail: detail.editorNotice },
                ]} />
                <SummaryPanel title="维度详情" items={detail.dimensions.map((dimension) => ({
                  name: `${dimension.name} / ${dimension.code}`,
                  detail: `权重 ${dimension.weight} · 分值 ${dimension.scoreRange} · 排序 ${dimension.sort} · ${dimension.description}`,
                }))} />
              </>
            ) : (
              <SummaryPanel title="模板详情" items={[{ name: '当前状态', detail: '暂无模板数据，可先创建首个 rubric 模板。' }]} />
            )}
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
