import Link from 'next/link';
import { PermissionGuard } from '@/components/business/permission-guard';
import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { homeworkPermissions, reviewViewModes } from '@/features/homework/constants';
import { homeworkReviewFormSchema } from '@/features/homework/schema';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';
import { saveHomeworkReviewDraft, submitHomeworkReview } from './actions';

export default async function HomeworkReviewWorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams?: Promise<{ saved?: string; submitted?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { submissionId } = await params;
  const query = await searchParams;
  const detail = await homeworkService.detail(submissionId);
  const taxonomies = await homeworkService.taxonomyQuery();
  const draft = detail.reviewDraft;
  const selectedErrorIds = new Set(draft?.finalErrorItems?.map((item) => item.errorTaxonomyId) ?? taxonomies.list.slice(0, 2).map((item) => item.id));
  const formDefaults = {
    reviewResult: draft?.reviewResult ?? ((detail.review?.reviewResult as 'approved' | 'adjusted' | 'rejected' | undefined) ?? 'adjusted'),
    finalAccuracyPct: draft?.finalAccuracyPct ?? detail.review?.finalAccuracyPct ?? 0,
    finalErrorSummary: draft?.finalErrorSummary ?? detail.review?.finalErrorSummary ?? '',
    finalSuggestion: draft?.finalSuggestion ?? detail.review?.finalSuggestion ?? '',
    publishToFamily: draft?.publishToFamily ?? detail.review?.publishToFamily ?? false,
  };

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.review)}>
      <div className="stack">
        <PageHeader
          title={`作业复核工作台 / ${detail.submissionNo}`}
          description={`detail key: ${JSON.stringify(queryKeys.homeworkSubmissionDetail(submissionId))} / review key: ${JSON.stringify(queryKeys.homeworkReviewDraft(submissionId))}`}
          actions={
            <>
              {detail.navigation.prev ? <Link className="btn" href={`/homework/review/${detail.navigation.prev.id}`}>上一条：{detail.navigation.prev.label}</Link> : <button className="btn" disabled>没有上一条</button>}
              {detail.navigation.next ? <Link className="btn" href={`/homework/review/${detail.navigation.next.id}`}>下一条：{detail.navigation.next.label}</Link> : <button className="btn" disabled>没有下一条</button>}
              <span className="badge">status: {detail.aiJob.status}</span>
            </>
          }
        />

        {query?.saved === '1' ? <section className="panel"><div className="badge success">草稿已保存</div></section> : null}
        {query?.submitted === '1' ? <section className="panel"><div className="badge success">正式复核已提交</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <div className="review-layout">
          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>左栏 / 附件</h3>
                <p>当前可读取真实 fileId 元数据，并在同页切换上一条 / 下一条作业。</p>
              </div>
              <div className="button-row">
                {detail.navigation.prev ? <Link className="btn" href={`/homework/review/${detail.navigation.prev.id}`}>上一条</Link> : null}
                {detail.navigation.next ? <Link className="btn" href={`/homework/review/${detail.navigation.next.id}`}>下一条</Link> : null}
              </div>
            </div>
            {detail.attachments.map((attachment) => (
              <div className="attachment-card" key={attachment.fileId}>
                <div className="attachment-preview">{attachment.name}</div>
                <div className="subtle">{attachment.detail}</div>
                {attachment.blockedReason ? <div className="subtle" style={{ marginTop: 8 }}>{attachment.blockedReason}</div> : null}
                <div className="button-row" style={{ marginTop: 12 }}>
                  {attachment.directHref ? <a className="btn primary" href={attachment.directHref} target="_blank" rel="noreferrer">打开文件</a> : null}
                  <a className="btn" href={attachment.href} target="_blank" rel="noreferrer">查看元数据</a>
                </div>
              </div>
            ))}
          </section>

          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>中栏 / AI 结果</h3>
                <p>真实 detail 已接；没有分析结果时回退到 submission/review 当前状态摘要。</p>
              </div>
              <div className="button-row">
                <span className="badge">{detail.aiJob.status}</span>
                <span className="badge">jobId: {detail.aiJob.jobId}</span>
              </div>
            </div>

            <TabStrip tabs={[...reviewViewModes]} active="Markdown" />
            <div className="code">{detail.rawMarkdown}</div>

            <TabStrip tabs={[...reviewViewModes]} active="Structured JSON" />
            <div className="code">{JSON.stringify(detail.structuredResult, null, 2)}</div>

            <TimelinePanel title="AI 错因建议 / 家长反馈草案" items={detail.suggestions} />
          </section>

          <form className="panel stack">
            <div className="page-header">
              <div>
                <h3>右栏 / 教师复核表单</h3>
                <p>PUT review-draft + POST review 已接真实 API。</p>
              </div>
              <div className="badge success">schema fields: {Object.keys(homeworkReviewFormSchema.shape).length}</div>
            </div>

            <div className="summary-item">
              <strong>当前学生 / 学科</strong>
              <div className="subtle">{detail.studentName} / {detail.subject} / 教师 {detail.teacherName}</div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>reviewResult</label>
                <select className="select" name="reviewResult" defaultValue={formDefaults.reviewResult}>
                  <option value="approved">approved</option>
                  <option value="adjusted">adjusted</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className="field">
                <label>finalAccuracyPct</label>
                <input className="input" name="finalAccuracyPct" type="number" min="0" max="100" defaultValue={String(formDefaults.finalAccuracyPct)} />
              </div>
              <div className="field form-span-2">
                <label>错因勾选</label>
                <div className="chip-row">
                  {taxonomies.list.map((taxonomy) => (
                    <label className="tab" key={taxonomy.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" name="errorTaxonomyId" value={taxonomy.id} defaultChecked={selectedErrorIds.has(taxonomy.id)} />
                      <span>{taxonomy.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field form-span-2">
                <label>错因备注</label>
                <textarea className="textarea" name="finalErrorSummary" defaultValue={formDefaults.finalErrorSummary} />
              </div>
              <div className="field form-span-2">
                <label>家长反馈建议</label>
                <textarea className="textarea" name="finalSuggestion" defaultValue={formDefaults.finalSuggestion} />
              </div>
              <div className="field form-span-2">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="publishToFamily" defaultChecked={formDefaults.publishToFamily} />
                  <span>提交后同步发布给家庭</span>
                </label>
              </div>
            </div>

            <div className="button-row">
              <button className="btn" formAction={saveHomeworkReviewDraft.bind(null, submissionId)}>保存草稿</button>
              <button className="btn primary" formAction={submitHomeworkReview.bind(null, submissionId)}>提交正式复核</button>
            </div>

            <SummaryPanel title="复核元信息" items={detail.reviewMeta} />
          </form>
        </div>
      </div>
    </PermissionGuard>
  );
}
