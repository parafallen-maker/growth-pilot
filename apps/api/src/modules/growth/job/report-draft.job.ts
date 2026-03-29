import { Injectable } from '@nestjs/common';
import type { GrowthReport } from '@growthpilot/schema/index';
import { BullmqJobBroker } from '../../jobs/queue/bullmq-job-broker';
import { GROWTH_REPORT_DRAFT_JOB, GROWTH_REPORT_DRAFT_QUEUE } from '../../jobs/queue/job-queue.constants';
import { GrowthReportDraftDispatchInput, GrowthReportDraftJobPayload } from '../../jobs/queue/job-queue.types';
import { JobsService } from '../../jobs/service/jobs.service';
import { GrowthRepository } from '../repository/growth.repository';
import { ReportMaterialAssembler } from './report-material-assembler';

@Injectable()
export class ReportDraftJob {
  constructor(
    private readonly growthRepository: GrowthRepository,
    private readonly materialAssembler: ReportMaterialAssembler,
    private readonly jobsService: JobsService,
    private readonly bullmqJobBroker: BullmqJobBroker,
  ) {}

  async queue(request: GrowthReportDraftDispatchInput) {
    const job = this.jobsService.createJob({
      jobType: 'growth_report_generate',
      bizType: 'growth_report',
      bizId: `${request.reportType}:${request.periodKey}:${request.studentIds.join(',')}`,
      payload: { ...request },
    });

    const payload: GrowthReportDraftJobPayload = {
      jobId: job.jobId,
      request: { ...request },
    };
    const queued = await this.bullmqJobBroker.enqueue(GROWTH_REPORT_DRAFT_QUEUE, GROWTH_REPORT_DRAFT_JOB, job.jobId, payload);

    if (!queued) {
      void this.executeQueuedJob(payload).catch(() => undefined);
    }

    return { jobId: job.jobId, status: job.status };
  }

  async executeQueuedJob(payload: GrowthReportDraftJobPayload) {
    return this.jobsService.processJob(payload.jobId, async ({ jobId }) => {
      const reportIds: string[] = [];

      for (const studentId of payload.request.studentIds) {
        const materials = await this.materialAssembler.assemble(studentId, payload.request.periodKey);
        const now = new Date().toISOString();
        const reportId = `report-${studentId}-${payload.request.periodKey}`;
        const report: GrowthReport = {
          id: reportId,
          studentId,
          termId: payload.request.termId ?? null,
          reportType: payload.request.reportType,
          periodKey: payload.request.periodKey,
          status: 'draft',
          title: `${payload.request.periodKey} ${payload.request.reportType === 'weekly' ? '周报' : '月报'}草稿`,
          draftMarkdown: `# ${payload.request.periodKey} 成长草稿\n\n- 观察数：${materials.growthObservations.length}\n- 目标数：${materials.goals.length}\n- 素材装配：已持久化`,
          summaryJson: materials,
          generatedByJobId: jobId,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        await this.growthRepository.createReport(report);
        reportIds.push(reportId);
      }

      return {
        reportIds,
        reportCount: reportIds.length,
        reportType: payload.request.reportType,
        periodKey: payload.request.periodKey,
      };
    });
  }
}
