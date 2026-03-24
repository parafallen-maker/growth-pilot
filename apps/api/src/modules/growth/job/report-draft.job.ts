import { Injectable } from '@nestjs/common';
import type { GrowthReport } from '@growthpilot/schema/index';
import { GrowthRepository } from '../repository/growth.repository';
import { ReportMaterialAssembler } from './report-material-assembler';

@Injectable()
export class ReportDraftJob {
  constructor(
    private readonly growthRepository: GrowthRepository,
    private readonly materialAssembler: ReportMaterialAssembler,
  ) {}

  queue(request: { reportType: 'weekly' | 'monthly'; periodKey: string; studentIds: string[]; termId?: string }) {
    const jobId = `job-growth-report-${String(Date.now())}`;
    this.growthRepository.createReportJob({ jobId, request, status: 'queued', createdAt: new Date().toISOString() });

    for (const studentId of request.studentIds) {
      const materials = this.materialAssembler.assemble(studentId, request.periodKey);
      const now = new Date().toISOString();
      const report: GrowthReport = {
        id: `report-${studentId}-${request.periodKey}`,
        studentId,
        termId: request.termId ?? null,
        reportType: request.reportType,
        periodKey: request.periodKey,
        status: 'draft',
        title: `${request.periodKey} ${request.reportType === 'weekly' ? '周报' : '月报'}草稿`,
        draftMarkdown: `# ${request.periodKey} 成长草稿\n\n- 观察数：${materials.growthObservations.length}\n- 目标数：${materials.goals.length}\n- 素材装配：placeholder`,
        summaryJson: materials,
        generatedByJobId: jobId,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.growthRepository.createReport(report);
    }

    return { jobId, status: 'queued' };
  }
}
