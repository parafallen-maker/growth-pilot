import { Injectable } from '@nestjs/common';
import type { GrowthReport } from '@growthpilot/schema/index';
import { JobsService } from '../../jobs/service/jobs.service';
import { GrowthRepository } from '../repository/growth.repository';
import { ReportMaterialAssembler } from './report-material-assembler';

@Injectable()
export class ReportDraftJob {
  constructor(
    private readonly growthRepository: GrowthRepository,
    private readonly materialAssembler: ReportMaterialAssembler,
    private readonly jobsService: JobsService,
  ) {}

  queue(request: { reportType: 'weekly' | 'monthly'; periodKey: string; studentIds: string[]; termId?: string }) {
    const job = this.jobsService.createJob({
      jobType: 'growth_report_generate',
      bizType: 'growth_report',
      bizId: `${request.reportType}:${request.periodKey}:${request.studentIds.join(',')}`,
      payload: request,
    });

    this.jobsService.processJob(job.jobId, async ({ jobId }) => {
      const reportIds: string[] = [];

      for (const studentId of request.studentIds) {
        const materials = await this.materialAssembler.assemble(studentId, request.periodKey);
        const now = new Date().toISOString();
        const reportId = `report-${studentId}-${request.periodKey}`;
        const report: GrowthReport = {
          id: reportId,
          studentId,
          termId: request.termId ?? null,
          reportType: request.reportType,
          periodKey: request.periodKey,
          status: 'draft',
          title: `${request.periodKey} ${request.reportType === 'weekly' ? '周报' : '月报'}草稿`,
          draftMarkdown: `# ${request.periodKey} 成长草稿\n\n- 观察数：${materials.growthObservations.length}\n- 目标数：${materials.goals.length}\n- 素材装配：已持久化`,
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
        reportType: request.reportType,
        periodKey: request.periodKey,
      };
    });

    return { jobId: job.jobId, status: job.status };
  }
}
