import { PermissionGuard } from '@/components/business/permission-guard';
import { PageHeader, SummaryPanel, TabStrip, TimelinePanel } from '@/components/business/page-blocks';
import { homeworkPermissions, reviewViewModes } from '@/features/homework/constants';
import { homeworkReviewDefaultValues, homeworkReviewFormSchema } from '@/features/homework/schema';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { homeworkService } from '@/services/homework-service';
import { homeworkReviewDraftStore } from '@/store/homework-review-store';

export default function HomeworkReviewWorkbenchPage({ params }: { params: { submissionId: string } }) {
  const detail = homeworkService.detail(params.submissionId);
  const draft = homeworkReviewDraftStore.getInitialDraft(params.submissionId);

  return (
    <PermissionGuard allowed={mockCurrentUser.permissions.includes(homeworkPermissions.review)}>
      <div className="stack">
        <PageHeader
          title={`作业复核工作台 / ${params.submissionId}`}
          description={`P11 三栏布局已落骨架。detail key: ${JSON.stringify(queryKeys.homeworkSubmissionDetail(params.submissionId))} / review key: ${JSON.stringify(queryKeys.homeworkReviewDraft(params.submissionId))}`}
          actions={
            <>
              <button className="btn">上一条</button>
              <button className="btn">下一条</button>
              <button className="btn">保存草稿</button>
              <button className="btn primary">提交正式复核</button>
            </>
          }
        />

        <section className="panel unsaved-banner">
          <div>
            <div className="badge warning">未保存提醒占位</div>
            <h3 style={{ marginTop: 12 }}>切换 submission 时保留提醒，不让老师的修改白给。</h3>
            <p>{draft.warning}</p>
          </div>
          <div className="button-row">
            <button className="btn">放弃修改</button>
            <button className="btn primary">继续编辑</button>
          </div>
        </section>

        <div className="review-layout">
          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>左栏 / 原图附件</h3>
                <p>多页切换、缩略图、放大镜与 OCR 标记层位已预留。</p>
              </div>
              <div className="button-row">
                <button className="btn">上一页</button>
                <button className="btn">下一页</button>
                <button className="btn">放大</button>
              </div>
            </div>
            {detail.attachments.map((attachment) => (
              <div className="attachment-card" key={attachment.name}>
                <div className="attachment-preview">{attachment.name}</div>
                <div className="subtle">{attachment.detail}</div>
              </div>
            ))}
          </section>

          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>中栏 / AI 结果</h3>
                <p>rawMarkdown + structured JSON 双视图，错因建议单独展示。</p>
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

          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>右栏 / 教师复核表单</h3>
                <p>默认值来自 DTO/VO mapper，不直接绑 raw response。</p>
              </div>
              <div className="badge success">schema ready</div>
            </div>

            <div className="summary-item">
              <strong>Zod schema</strong>
              <div className="subtle">字段：{Object.keys(homeworkReviewFormSchema.shape).join(' / ')}</div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>finalAccuracyPct</label>
                <input className="input" defaultValue={String(homeworkReviewDefaultValues.finalAccuracyPct)} />
              </div>
              <div className="field">
                <label>publishToParent</label>
                <select className="select" defaultValue={homeworkReviewDefaultValues.publishToParent ? '是' : '否'}>
                  <option>是</option>
                  <option>否</option>
                </select>
              </div>
              <div className="field form-span-2">
                <label>错因勾选</label>
                <div className="chip-row">
                  {homeworkReviewDefaultValues.errorCodes.map((code) => (
                    <span className="tab active" key={code}>{code}</span>
                  ))}
                  <span className="tab">+ 增加错因</span>
                </div>
              </div>
              <div className="field form-span-2">
                <label>错因备注</label>
                <textarea className="textarea" defaultValue={homeworkReviewDefaultValues.errorRemark} />
              </div>
              <div className="field form-span-2">
                <label>家长反馈建议</label>
                <textarea className="textarea" defaultValue={homeworkReviewDefaultValues.parentFeedback} />
              </div>
            </div>

            <SummaryPanel title="复核元信息" items={detail.reviewMeta} />
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
