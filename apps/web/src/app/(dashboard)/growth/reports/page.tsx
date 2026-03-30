import { FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { SubmitButton } from '@/components/business/submit-button';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';
import { studentService } from '@/services/students-service';
import { bulkPublishGrowthReports, generateGrowthReport, publishGrowthReport, reviewGrowthReport } from '../actions';

type GrowthReportsResult = Awaited<ReturnType<typeof growthService.queryReports>>;

type DraftSectionMap = {
  headline: string;
  strengths: string;
  progress: string;
  supportNeeded: string;
  nextSteps: string;
  parentSync: string;
  appendix: string;
};

function buildDraftSections(draftMarkdown: string): DraftSectionMap {
  const trimmed = draftMarkdown.trim();
  return {
    headline: trimmed ? trimmed.split('\n').slice(0, 2).join('\n').trim() : '',
    strengths: '',
    progress: '',
    supportNeeded: '',
    nextSteps: '',
    parentSync: '',
    appendix: trimmed,
  };
}

function ReportListSection({ title, items }: { title: string; items: GrowthReportsResult['queued'] }) {
  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h3>{title}</h3>
          <p>成长报告按状态分组展示。</p>
        </div>
        <span className="badge">{items.length} 条</span>
      </div>
      {items.length ? items.map((item) => (
        <article key={item.reportId} className="selection-card active-card">
          <div className="page-header" style={{ marginBottom: 8 }}>
            <strong>{item.studentName} · {item.reportType}</strong>
            <span className="badge">{item.status}</span>
          </div>
          <div className="subtle">{item.period} · owner: {item.owner}</div>
          <div className="subtle">{item.actionHint}</div>
        </article>
      )) : <div className="subtle">当前分组暂无报告。</div>}
    </section>
  );
}

export default async function GrowthReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ generated?: string; reviewed?: string; published?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, growthPermissions.reportsView);
  const [result, action, students] = await Promise.all([
    growthService.queryReports({ pageNo: 1, pageSize: 20, reportType: 'weekly', publishStatus: 'all' }),
    Promise.resolve(growthService.actionReport()),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);
  const selectedReportId = result.firstReportId ?? result.drafts[0]?.reportId ?? result.queued[0]?.reportId ?? result.published[0]?.reportId ?? '';
  const draftMarkdown = result.editor.draftSections[0]?.detail ?? '';
  const reportTitle = result.editor.draftSections[0]?.title ?? '报告正文';
  const draftSections = buildDraftSections(draftMarkdown);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长报告" permissionCode={growthPermissions.reportsView} />}>
      <div className="stack">
        <PageHeader
          title="成长报告"
          description="成长周报生成、结构化复核与发布管理"
          actions={<><a className="btn primary" href="#report-generate-form">生成草稿</a><a className="btn" href="#report-review-form">报告复核</a><a className="btn" href="#report-publish-form">发布设置</a></>}
        />
        {query?.generated ? <section className="panel"><div className="badge success">已生成报告：{query.generated} 份</div></section> : null}
        {query?.reviewed ? <section className="panel"><div className="badge success">已复核报告：{query.reviewed}</div></section> : null}
        {query?.published ? <section className="panel"><div className="badge success">已发布报告：{query.published}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <FilterBar fields={[
          { label: '报告类型', value: '周报', kind: 'select' },
          { label: '学期', value: '2026 春季', kind: 'select' },
          { label: '周 / 月', value: '2026 W12' },
          { label: '校区', value: '全部校区', kind: 'select' },
          { label: '老师', value: '全部老师', kind: 'select' },
          { label: '发布状态', value: '全部', kind: 'select' },
        ]} />
        <section className="panel stack" id="report-generate-form">
          <div className="page-header">
            <div>
              <h3>生成报告草稿</h3>
              <p>选择学生批量生成报告草稿。</p>
            </div>
          </div>
          <form className="form-grid" action={generateGrowthReport}>
            <div className="field"><label>报告类型</label><select className="select" name="reportType" defaultValue="weekly"><option value="weekly">weekly</option><option value="monthly">monthly</option></select></div>
            <div className="field"><label>周期键</label><input className="input" name="periodKey" defaultValue="2026-W12" required /></div>
            <div className="field"><label>学期 ID</label><input className="input" name="termId" defaultValue="2026-spring" /></div>
            <div className="field"><label>校区 ID</label><input className="input" name="campusId" defaultValue="campus-guiyang" /></div>
            <div className="field form-span-2"><label>学生</label><div className="chip-row">{students.list.map((student) => <label key={student.id} className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="studentIds" value={student.id} defaultChecked={students.list.indexOf(student) === 0} /><span>{student.name} / {student.studentNo}</span></label>)}</div></div>
            <div className="button-row form-span-2"><SubmitButton className="btn primary" pendingLabel="生成中...">生成草稿</SubmitButton></div>
          </form>
        </section>
        <section className="panel stack">
          <div className="page-header">
            <div>
              <h3>批量报告动作</h3>
              <p>将已复核的报告批量发布。</p>
            </div>
          </div>
          <form className="stack" action={bulkPublishGrowthReports}>
            <div className="summary-list">
              {result.drafts.filter((item) => item.status === 'reviewed').length ? result.drafts.filter((item) => item.status === 'reviewed').map((item) => (
                <label key={item.reportId} className="summary-item bulk-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <input type="checkbox" name="reportIds" value={item.reportId} defaultChecked />
                    <div>
                      <strong>{item.studentName} · {item.period}</strong>
                      <div className="subtle">{item.reportType} · {item.status} · owner {item.owner}</div>
                    </div>
                  </div>
                </label>
              )) : <div className="summary-item">当前没有处于 reviewed 状态的报告可批量发布。</div>}
            </div>
            <div className="chip-row">
              <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="app" defaultChecked /><span>app</span></label>
              <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="wechat" /><span>wechat</span></label>
              <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="sms" /><span>sms</span></label>
            </div>
            <div className="field"><label>批量发布备注</label><textarea className="textarea" name="publishNote" defaultValue="已完成集中复核，按默认渠道批量发布。" /></div>
            <div className="button-row"><SubmitButton className="btn" pendingLabel="批量发布中..." disabled={!result.drafts.some((item) => item.status === 'reviewed')}>批量发布已复核报告</SubmitButton></div>
          </form>
        </section>
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
          <section className="panel stack" id="report-review-form">
            <div className="page-header"><h3>结构化复核编辑器</h3><span className="badge">real detail</span></div>
            {result.editor.draftSections.map((item) => (
              <article key={item.title} className="selection-card">
                <strong>{item.title}</strong>
                <div className="subtle" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{item.detail}</div>
              </article>
            ))}
            <form className="selection-card stack" action={reviewGrowthReport}>
              <input type="hidden" name="reportId" value={selectedReportId} />
              <strong>报告复核</strong>
              <div className="subtle">review: {action.reviewEndpoint} / 当前用户：{currentUser.name}</div>
              <div className="field"><label>标题</label><input className="input" name="title" defaultValue={reportTitle} /></div>
              <div className="grid-2">
                <div className="field"><label>本期结论</label><textarea className="textarea" name="headline" rows={4} defaultValue={draftSections.headline} placeholder="一句话总结本期成长表现" /></div>
                <div className="field"><label>亮点表现</label><textarea className="textarea" name="strengths" rows={4} defaultValue={draftSections.strengths} placeholder="课堂、作业、习惯等亮点" /></div>
                <div className="field"><label>进步观察</label><textarea className="textarea" name="progress" rows={4} defaultValue={draftSections.progress} placeholder="相较上期的具体进步" /></div>
                <div className="field"><label>待支持点</label><textarea className="textarea" name="supportNeeded" rows={4} defaultValue={draftSections.supportNeeded} placeholder="仍需教师/家长协同关注的问题" /></div>
                <div className="field"><label>下阶段计划</label><textarea className="textarea" name="nextSteps" rows={4} defaultValue={draftSections.nextSteps} placeholder="下一周目标与辅导动作" /></div>
                <div className="field"><label>家长同步话术</label><textarea className="textarea" name="parentSync" rows={4} defaultValue={draftSections.parentSync} placeholder="面向家长的同步建议与鼓励表达" /></div>
              </div>
              <div className="field"><label>复核备注</label><textarea className="textarea" name="reviewNote" defaultValue="已核对措辞与成长建议，可进入发布。" /></div>
              <div className="field"><label>附加正文 / 原稿补充</label><textarea className="textarea" name="appendix" defaultValue={draftSections.appendix} rows={8} placeholder="补充细节、引用原稿或保留原始草稿片段" /></div>
              <div className="button-row"><SubmitButton className="btn primary" pendingLabel="提交中..." disabled={!selectedReportId}>提交复核</SubmitButton></div>
            </form>
          </section>
          <section className="panel stack" id="report-publish-form">
            <div className="page-header"><h3>发布设置</h3></div>
            <SummaryPanel title="发布规则" items={result.editor.publishSettings} />
            <article className="selection-card">
              <strong>动作约定</strong>
              <div className="subtle" style={{ marginTop: 8 }}>{action.note}</div>
              <div className="subtle" style={{ marginTop: 8 }}>generate: {action.generateEndpoint} / review: {action.reviewEndpoint} / publish: {action.publishEndpoint}</div>
            </article>
            <form className="selection-card stack" action={publishGrowthReport}>
              <input type="hidden" name="reportId" value={selectedReportId} />
              <strong>确认发布</strong>
              <div className="chip-row">
                <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="app" defaultChecked /><span>app</span></label>
                <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="wechat" /><span>wechat</span></label>
                <label className="tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="channels" value="sms" /><span>sms</span></label>
              </div>
              <div className="field"><label>发布备注</label><textarea className="textarea" name="publishNote" defaultValue="已通过教务复核，按默认渠道发布。" /></div>
              <div className="button-row"><SubmitButton className="btn primary" pendingLabel="发布中..." disabled={!selectedReportId}>确认发布</SubmitButton></div>
            </form>
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
