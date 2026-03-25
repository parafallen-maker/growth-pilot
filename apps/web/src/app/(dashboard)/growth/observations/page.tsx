import { FilterBar, MetricGrid, PageHeader } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';
import { studentService } from '@/services/students-service';
import { teacherService } from '@/services/teachers-service';
import { createGrowthObservation } from './actions';

export default async function GrowthObservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string; templateId?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, growthPermissions.observationsView);
  const [result, createMeta, students, teachers, rubrics] = await Promise.all([
    growthService.queryObservations({ pageNo: 1, pageSize: 20, scene: 'all', reportPublished: 'all', sortBy: 'observedAt', sortOrder: 'desc' }),
    Promise.resolve(growthService.createObservation()),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    teacherService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    growthService.queryRubrics({ pageNo: 1, pageSize: 20, status: 'active' }),
  ]);
  const publishedCount = result.list.filter((item) => item.reportPublished === '已纳入').length;
  const selectedTemplateId = rubrics.list.find((item) => item.rubricId === query?.templateId)?.rubricId ?? rubrics.list[0]?.rubricId ?? '';
  const activeRubric = selectedTemplateId ? await growthService.detailRubric(selectedTemplateId) : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长观察" permissionCode={growthPermissions.observationsView} />}>
      <div className="stack">
        <PageHeader
          title="成长观察"
          description={`真实列表接口已接：${JSON.stringify(queryKeys.growthObservations({ pageNo: 1, pageSize: 20, scene: 'all' }))}`}
          actions={<><a className="btn primary" href="#observation-create-form">新建观察</a><button className="btn">导出</button><button className="btn">动态 schema 预览</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">成长观察已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <MetricGrid items={[
          { label: '当前页观察', value: String(result.list.length), hint: `total ${result.page.total}` },
          { label: '已纳入报告', value: String(publishedCount), hint: 'publishToFamily=true' },
          { label: '待纳入报告', value: String(result.list.length - publishedCount), hint: '仍可进入报告素材池' },
          { label: '创建接口', value: 'POST ready', hint: createMeta.idempotencyHint },
        ]} />
        <section className="panel stack" id="observation-create-form">
          <div className="page-header">
            <div>
              <h3>新建成长观察</h3>
              <p>表单已接入 POST /growth/observations，可先切换所用 rubric，再按该模板的真实维度提交评分。</p>
            </div>
            <span className="badge success">POST /growth/observations</span>
          </div>
          {activeRubric ? (
            <>
              <form className="form-grid" method="get">
                <div className="field form-span-2">
                  <label>评分模板</label>
                  <select className="select" name="templateId" defaultValue={activeRubric.rubricId}>
                    {rubrics.list.map((rubric) => (
                      <option key={rubric.rubricId} value={rubric.rubricId}>
                        {rubric.name} / {rubric.scope} / {rubric.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="button-row form-span-2"><button className="btn" type="submit">切换模板维度</button><span className="subtle">当前模板：{activeRubric.name}</span></div>
              </form>
              <form className="form-grid" action={createGrowthObservation}>
              <input type="hidden" name="templateId" value={activeRubric.rubricId} />
              <div className="field"><label>学生</label><select className="select" name="studentId" required defaultValue={students.list[0]?.id ?? ''}>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
              <div className="field"><label>老师</label><select className="select" name="teacherId" defaultValue={teachers.list[0]?.id ?? ''}>{teachers.list.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div>
              <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="term-2026-spring" /></div>
              <div className="field"><label>观察日期</label><input className="input" type="date" name="observationDate" required /></div>
              <div className="field form-span-2"><label>场景</label><input className="input" name="scene" placeholder="课堂参与 / 课后练习 / 家校沟通" required /></div>
              {activeRubric.dimensions.map((dimension) => (
                <div className="field form-span-2" key={dimension.id}>
                  <input type="hidden" name="dimensionId" value={dimension.id} />
                  <label>{dimension.name}（{dimension.scoreRange}）</label>
                  <div className="form-grid">
                    <div className="field"><label>分数</label><input className="input" type="number" min={dimension.scoreRange.split('-')[0]} max={dimension.scoreRange.split('-')[1]} name={`score:${dimension.id}`} defaultValue={dimension.scoreRange.split('-')[1]} /></div>
                    <div className="field form-span-2"><label>维度备注</label><input className="input" name={`note:${dimension.id}`} placeholder={dimension.description} /></div>
                  </div>
                </div>
              ))}
              <div className="field form-span-2"><label>优势亮点</label><textarea className="textarea" name="strengths" placeholder="表现稳定、表达积极、作业自驱等" /></div>
              <div className="field form-span-2"><label>改进建议</label><textarea className="textarea" name="improvementNotes" placeholder="下一阶段重点观察与辅导建议" /></div>
              <div className="field form-span-2"><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" name="publishToFamily" /><span>同步纳入家庭可见内容</span></label></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit">创建观察</button><span className="subtle">提交模板：{activeRubric.name}</span></div>
            </form>
            </>
          ) : (
            <div className="badge warning">当前没有可用 rubric，无法创建观察。</div>
          )}
        </section>
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
