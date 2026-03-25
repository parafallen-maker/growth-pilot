import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GrowthGoal, GrowthObservation, GrowthReport, RubricTemplate } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { CreateGoalCheckinDto } from '../dto/create-goal-checkin.dto';
import { CreateGrowthGoalDto } from '../dto/create-growth-goal.dto';
import { CreateGrowthObservationDto } from '../dto/create-growth-observation.dto';
import { CreateRubricTemplateDto } from '../dto/create-rubric-template.dto';
import { GenerateGrowthReportDto } from '../dto/generate-report.dto';
import { GoalQueryDto } from '../dto/goal-query.dto';
import { ObservationQueryDto } from '../dto/observation-query.dto';
import { PublishGrowthReportDto } from '../dto/publish-growth-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReviewGrowthReportDto } from '../dto/review-growth-report.dto';
import { RubricQueryDto } from '../dto/rubric-query.dto';
import { ReportDraftJob } from '../job/report-draft.job';
import { GrowthRepository } from '../repository/growth.repository';

@Injectable()
export class GrowthService {
  constructor(
    private readonly growthRepository: GrowthRepository,
    private readonly reportDraftJob: ReportDraftJob,
  ) {}

  listRubrics(query: RubricQueryDto): PageResult<RubricTemplate> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.growthRepository.listRubrics().filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.keyword) return item.name.toLowerCase().includes(query.keyword.toLowerCase());
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  getRubric(templateId: string) {
    const template = this.growthRepository.findRubricById(templateId);
    if (!template) throw new NotFoundException(`Rubric ${templateId} not found`);
    return template;
  }

  createRubric(payload: CreateRubricTemplateDto) {
    const now = new Date().toISOString();
    const template: RubricTemplate = {
      id: `rubric-${String(this.growthRepository.listRubrics().length + 1).padStart(3, '0')}`,
      campusId: payload.campusId ?? null,
      termId: payload.termId ?? null,
      name: payload.name,
      stageScope: payload.stageScope,
      status: payload.status ?? 'active',
      description: payload.description,
      createdAt: now,
      updatedAt: now,
      dimensions: payload.dimensions.map((dimension, index) => ({
        id: `dimension-${String(Date.now())}-${index + 1}`,
        templateId: `rubric-${String(this.growthRepository.listRubrics().length + 1).padStart(3, '0')}`,
        code: dimension.code,
        name: dimension.name,
        weight: dimension.weight ?? 1,
        scoreMin: dimension.scoreMin ?? 1,
        scoreMax: dimension.scoreMax ?? 5,
        description: dimension.description,
        sortOrder: dimension.sortOrder ?? (index + 1) * 10,
      })),
    };
    return this.growthRepository.createRubric(template);
  }

  listObservations(query: ObservationQueryDto): PageResult<GrowthObservation> {
    const { pageNo, pageSize } = normalizePage(query);
    const publishedObservationIds = this.listPublishedObservationIds();
    const filtered = this.growthRepository.listObservations().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.teacherId && item.teacherId !== query.teacherId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.scene && item.scene !== query.scene) return false;
      if (query.dateFrom && item.observationDate < query.dateFrom) return false;
      if (query.dateTo && item.observationDate > query.dateTo) return false;
      if (query.reportPublished === 'published' && !publishedObservationIds.has(item.id)) return false;
      if (query.reportPublished === 'unpublished' && publishedObservationIds.has(item.id)) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createObservation(payload: CreateGrowthObservationDto) {
    const template = this.getRubric(payload.templateId);
    const allowedDimensions = new Set(template.dimensions.map((item) => item.id));
    const totalScore = payload.scores.reduce((sum, item) => sum + item.score, 0);
    const now = new Date().toISOString();
    const observation: GrowthObservation = {
      id: `observation-${String(this.growthRepository.listObservations().length + 1).padStart(3, '0')}`,
      studentId: payload.studentId,
      termId: payload.termId ?? null,
      teacherId: payload.teacherId ?? null,
      templateId: payload.templateId,
      observationDate: payload.observationDate,
      scene: payload.scene,
      scores: payload.scores.filter((item) => allowedDimensions.has(item.dimensionId)),
      totalScore,
      strengths: payload.strengths,
      improvementNotes: payload.improvementNotes,
      publishToFamily: payload.publishToFamily ?? false,
      createdAt: now,
      updatedAt: now,
    };
    return this.growthRepository.createObservation(observation);
  }

  listGoals(query: GoalQueryDto): PageResult<GrowthGoal> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.growthRepository.listGoals().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.goalType && item.goalType !== query.goalType) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.keyword) return item.title.toLowerCase().includes(query.keyword.toLowerCase());
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createGoal(payload: CreateGrowthGoalDto) {
    const now = new Date().toISOString();
    const goal: GrowthGoal = {
      id: `goal-${String(this.growthRepository.listGoals().length + 1).padStart(3, '0')}`,
      studentId: payload.studentId,
      termId: payload.termId ?? null,
      goalType: payload.goalType,
      title: payload.title,
      description: payload.description,
      ownerRole: payload.ownerRole ?? 'teacher',
      metricType: payload.metricType ?? 'score',
      baselineValue: payload.baselineValue,
      targetValue: payload.targetValue,
      currentValue: payload.currentValue,
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      status: payload.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
      checkins: [],
    };
    return this.growthRepository.createGoal(goal);
  }

  createCheckin(goalId: string, payload: CreateGoalCheckinDto) {
    const goal = this.growthRepository.findGoalById(goalId);
    if (!goal) throw new NotFoundException(`Goal ${goalId} not found`);
    const checkin = {
      id: `checkin-${goalId}-${goal.checkins.length + 1}`,
      goalId,
      checkinDate: payload.checkinDate,
      progressValue: payload.progressValue,
      progressNote: payload.progressNote,
      nextAction: payload.nextAction,
      createdAt: new Date().toISOString(),
    };
    return this.growthRepository.addCheckin(checkin)!;
  }

  listReports(query: ReportQueryDto): PageResult<GrowthReport> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.growthRepository.listReports().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.reportType && item.reportType !== query.reportType) return false;
      if (query.periodKey && item.periodKey !== query.periodKey) return false;
      if (query.status && item.status !== query.status) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  getReportDetail(reportId: string) {
    const report = this.growthRepository.findReportById(reportId);
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);
    return {
      report,
      workflow: this.extractWorkflow(report.summaryJson),
    };
  }

  generateReportDraft(payload: GenerateGrowthReportDto) {
    return this.reportDraftJob.queue(payload);
  }

  reviewReport(reportId: string, payload: ReviewGrowthReportDto) {
    const report = this.growthRepository.findReportById(reportId);
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);
    if (report.status === 'published') {
      throw new ConflictException('published report can not be reviewed again');
    }

    const now = new Date().toISOString();
    const summaryJson = {
      ...report.summaryJson,
      ...(payload.summaryJson ?? {}),
      workflow: {
        ...this.extractWorkflow(report.summaryJson),
        reviewedAt: now,
        reviewerUserId: payload.reviewerUserId ?? this.extractWorkflow(report.summaryJson).reviewerUserId ?? null,
        reviewNote: payload.reviewNote ?? this.extractWorkflow(report.summaryJson).reviewNote ?? null,
      },
    };

    const updated = this.growthRepository.updateReport(reportId, {
      status: 'reviewed',
      title: payload.title ?? report.title,
      draftMarkdown: payload.draftMarkdown ?? report.draftMarkdown,
      summaryJson,
      updatedAt: now,
    });
    if (!updated) throw new NotFoundException(`Report ${reportId} not found`);

    return {
      reportId,
      status: updated.status,
      reviewedAt: now,
    };
  }

  publishReport(reportId: string, payload: PublishGrowthReportDto) {
    const report = this.growthRepository.findReportById(reportId);
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);
    if (report.status === 'draft') {
      throw new ConflictException('report must be reviewed before publish');
    }
    if (report.status === 'published') {
      throw new ConflictException('report already published');
    }

    const now = new Date().toISOString();
    const summaryJson = {
      ...report.summaryJson,
      workflow: {
        ...this.extractWorkflow(report.summaryJson),
        publishedAt: now,
        publisherUserId: payload.publisherUserId ?? null,
        publishNote: payload.publishNote ?? null,
        channels: payload.channels ?? [],
      },
    };

    const updated = this.growthRepository.updateReport(reportId, {
      status: 'published',
      summaryJson,
      publishedAt: now,
      updatedAt: now,
    });
    if (!updated) throw new NotFoundException(`Report ${reportId} not found`);

    return {
      reportId,
      status: updated.status,
      publishedAt: now,
    };
  }

  private listPublishedObservationIds() {
    const ids = new Set<string>();
    for (const report of this.growthRepository.listReports()) {
      if (report.status !== 'published') continue;
      const observationIds = this.extractMaterialObservationIds(report.summaryJson);
      observationIds.forEach((id) => ids.add(id));
    }
    return ids;
  }

  private extractMaterialObservationIds(summaryJson: Record<string, unknown>) {
    const refs = summaryJson.materialRefs;
    if (refs && typeof refs === 'object' && Array.isArray((refs as { observationIds?: unknown }).observationIds)) {
      return ((refs as { observationIds: unknown[] }).observationIds).filter((item): item is string => typeof item === 'string');
    }
    const observations = summaryJson.growthObservations;
    if (!Array.isArray(observations)) return [];
    return observations
      .map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined))
      .filter((item): item is string => typeof item === 'string');
  }

  private extractWorkflow(summaryJson: Record<string, unknown>) {
    const workflow = summaryJson.workflow;
    return workflow && typeof workflow === 'object' ? (workflow as Record<string, unknown>) : {};
  }

  private page<T>(list: T[], pageNo: number, pageSize: number): PageResult<T> {
    const start = (pageNo - 1) * pageSize;
    return { list: list.slice(start, start + pageSize), page: { pageNo, pageSize, total: list.length } };
  }
}
