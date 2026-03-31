import { PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { studentService } from '@/services/students-service';

export const dynamic = 'force-dynamic';

export default async function StudentsImportPage() {
  const detail = studentService.action();
  let jobs: Awaited<ReturnType<typeof studentService.listImportJobs>> = [];
  try {
    jobs = await studentService.listImportJobs();
  } catch {
    // API unavailable — show empty list gracefully
  }

  const latestJob = jobs[0] ?? null;
  const allErrors = jobs.flatMap((job) => (job.result?.errors ?? []).map((e) => ({ ...e, jobId: job.jobId })));
  const hasErrors = allErrors.length > 0;

  const jobTimelineItems = jobs.map((job) => ({
    title: `任务 ${job.jobId.slice(0, 8)}`,
    detail: `${job.status} / ${job.progress}% / 总${job.result?.totalRows ?? 0}行 / 有效${job.result?.validRows ?? 0}行 / 失败${job.result?.invalidRows ?? 0}行`,
  }));

  return (
    <div className="stack">
      <PageHeader
        title="学生导入中心"
        description="从 Excel 批量导入学生数据"
        actions={<><button className="btn primary">下载模板</button><button className="btn" disabled>上传文件</button></>}
      />
      <div className="grid-2">
        <SummaryPanel title="模板与字段映射" items={detail.fieldMappings.map((item) => ({ name: item.title, detail: item.detail }))} />
        <TimelinePanel title="导入任务列表" items={jobTimelineItems.length ? jobTimelineItems : [{ title: '暂无导入任务', detail: '上传文件后将自动创建导入任务' }]} />
      </div>
      {hasErrors && (
        <StateBlock state="error" title={`校验错误表 (${allErrors.length} 条)`} actionLabel="重新解析" />
      )}
      {!hasErrors && latestJob && (
        <StateBlock state={latestJob.status === 'completed' ? 'ready' : latestJob.status === 'failed' ? 'error' : 'loading'} title={latestJob.errorMessage ?? `任务 ${latestJob.jobId.slice(0, 8)} — ${latestJob.status}`} />
      )}
    </div>
  );
}
