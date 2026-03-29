import { PermissionGuard } from '@/components/business/permission-guard';
import { homeworkPermissions } from '@/features/homework/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';
import { saveHomeworkReviewDraft, submitHomeworkReview, triggerHomeworkAnalysis } from './actions';

// New Sub-components
import { ReviewHeader } from './components/ReviewHeader';
import { AttachmentGallery } from './components/AttachmentGallery';
import { AIAnalysisResult } from './components/AIAnalysisResult';
import { TeacherReviewForm } from './components/TeacherReviewForm';
import { AnalysisStatusAutoRefresh } from './components/AnalysisStatusAutoRefresh';

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

  // Data Fetching
  const detail = await homeworkService.detail(submissionId);
  const taxonomies = await homeworkService.taxonomyQuery();
  const draft = detail.reviewDraft;

  // Logic & Defaults
  const selectedErrorIds = new Set(
    draft?.finalErrorItems?.map((item) => item.errorTaxonomyId) ??
    taxonomies.list.slice(0, 2).map((item) => item.id)
  );

  const formDefaults = {
    reviewResult: draft?.reviewResult ?? ((detail.review?.reviewResult as string) ?? 'adjusted'),
    finalAccuracyPct: draft?.finalAccuracyPct ?? detail.review?.finalAccuracyPct ?? 0,
    finalErrorSummary: draft?.finalErrorSummary ?? detail.review?.finalErrorSummary ?? '',
    finalSuggestion: draft?.finalSuggestion ?? detail.review?.finalSuggestion ?? '',
    publishToFamily: draft?.publishToFamily ?? detail.review?.publishToFamily ?? false,
  };

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.review)}>
      <div className="stack">
        <AnalysisStatusAutoRefresh submissionId={submissionId} initialAiStatus={detail.aiJob.status} />

        {/* P1 Refactored: Structured Header */}
        <ReviewHeader
          submissionNo={detail.submissionNo}
          aiStatus={detail.aiJob.status}
          navigation={detail.navigation}
        />

        {/* Notifications */}
        {query?.saved === '1' && <section className="panel"><div className="badge success">草稿已保存</div></section>}
        {query?.saved?.startsWith('analysis:') && <section className="panel"><div className="badge success">AI 分析已触发</div></section>}
        {query?.submitted === '1' && <section className="panel"><div className="badge success">正式复核已提交</div></section>}
        {query?.error && <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section>}

        <div className="review-layout">
          {/* P1 Refactored: Attachment Review with Image Preview */}
          <AttachmentGallery
            attachments={detail.attachments}
            navigation={detail.navigation}
          />

          {/* P1 Refactored: AI Analysis result display */}
          <AIAnalysisResult
            status={detail.aiJob.status}
            rawMarkdown={detail.rawMarkdown}
            structuredResult={detail.structuredResult}
            suggestions={detail.suggestions}
            triggerAction={triggerHomeworkAnalysis.bind(null, submissionId)}
          />

          {/* P1 Refactored: Localized teacher review form with keyboard nav */}
          <TeacherReviewForm
            submissionId={submissionId}
            studentName={detail.studentName}
            subject={detail.subject}
            teacherName={detail.teacherName}
            taxonomies={taxonomies.list}
            selectedErrorIds={selectedErrorIds}
            formDefaults={formDefaults}
            navigation={detail.navigation}
            saveAction={saveHomeworkReviewDraft}
            submitAction={submitHomeworkReview}
            reviewMeta={detail.reviewMeta}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}
