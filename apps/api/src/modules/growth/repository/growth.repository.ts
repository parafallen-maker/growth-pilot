import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type {
  GrowthGoal,
  GrowthGoalCheckin,
  GrowthObservation,
  GrowthReport,
  RubricTemplate,
} from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { PersistentJsonStore } from '../../../common/persistent-json.store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';

interface GrowthState {
  rubricTemplates: RubricTemplate[];
  observations: GrowthObservation[];
  goals: GrowthGoal[];
  reports: GrowthReport[];
}

interface GrowthRepositoryPort {
  listRubrics(): Promise<RubricTemplate[]>;
  findRubricById(templateId: string): Promise<RubricTemplate | undefined>;
  createRubric(template: RubricTemplate): Promise<RubricTemplate>;
  listObservations(): Promise<GrowthObservation[]>;
  createObservation(observation: GrowthObservation): Promise<GrowthObservation>;
  listGoals(): Promise<GrowthGoal[]>;
  findGoalById(goalId: string): Promise<GrowthGoal | undefined>;
  createGoal(goal: GrowthGoal): Promise<GrowthGoal>;
  addCheckin(checkin: GrowthGoalCheckin): Promise<GrowthGoalCheckin | undefined>;
  listReports(): Promise<GrowthReport[]>;
  findReportById(reportId: string): Promise<GrowthReport | undefined>;
  createReport(report: GrowthReport): Promise<GrowthReport>;
  updateReport(reportId: string, patch: Partial<GrowthReport>): Promise<GrowthReport | undefined>;
}

const createInitialState = (): GrowthState => ({
  rubricTemplates: [
    {
      id: 'rubric-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      name: '一年级作业陪伴 Rubric',
      stageScope: 'grade-1',
      status: 'active',
      description: '用于课后作业观察的最小模板',
      createdAt: '2026-03-20T10:00:00+08:00',
      updatedAt: '2026-03-20T10:00:00+08:00',
      dimensions: [
        { id: 'dimension-001', templateId: 'rubric-001', code: 'focus', name: '专注度', weight: 1, scoreMin: 1, scoreMax: 5, sortOrder: 10 },
        { id: 'dimension-002', templateId: 'rubric-001', code: 'independence', name: '独立性', weight: 1, scoreMin: 1, scoreMax: 5, sortOrder: 20 },
      ],
    },
  ],
  observations: [
    {
      id: 'observation-001',
      studentId: 'student-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      templateId: 'rubric-001',
      observationDate: '2026-03-23',
      scene: 'after_class_homework',
      scores: [
        { dimensionId: 'dimension-001', score: 4, note: '能保持 20 分钟专注' },
        { dimensionId: 'dimension-002', score: 3, note: '遇到难题会寻求提示' },
      ],
      totalScore: 7,
      strengths: '愿意订正',
      improvementNotes: '遇到难题先独立思考 3 分钟',
      publishToFamily: false,
      createdAt: '2026-03-23T18:00:00+08:00',
      updatedAt: '2026-03-23T18:00:00+08:00',
    },
  ],
  goals: [
    {
      id: 'goal-001',
      studentId: 'student-001',
      termId: 'term-2026-spring',
      goalType: 'habit',
      title: '一周内 5 天独立完成口算',
      description: '减少直接求助',
      ownerRole: 'teacher',
      metricType: 'count',
      baselineValue: 2,
      targetValue: 5,
      currentValue: 3,
      startDate: '2026-03-23',
      dueDate: '2026-03-30',
      status: 'active',
      createdAt: '2026-03-23T18:30:00+08:00',
      updatedAt: '2026-03-23T18:30:00+08:00',
      checkins: [
        {
          id: 'checkin-001',
          goalId: 'goal-001',
          checkinDate: '2026-03-24',
          progressValue: 3,
          progressNote: '今天先自己尝试后再提问',
          nextAction: '保持错题先标记再求助',
          createdAt: '2026-03-24T18:30:00+08:00',
        },
      ],
    },
  ],
  reports: [],
});

class FileGrowthRepository implements GrowthRepositoryPort {
  private readonly store: PersistentJsonStore<GrowthState>;

  constructor(filePath = '.data/growth.json') {
    this.store = new PersistentJsonStore<GrowthState>(filePath, createInitialState);
  }

  async listRubrics() { return this.store.get().rubricTemplates; }
  async findRubricById(templateId: string) { return this.store.get().rubricTemplates.find((item) => item.id === templateId); }
  async createRubric(template: RubricTemplate) { this.store.update((state) => { state.rubricTemplates.unshift(template); }); return template; }
  async listObservations() { return this.store.get().observations; }
  async createObservation(observation: GrowthObservation) { this.store.update((state) => { state.observations.unshift(observation); }); return observation; }
  async listGoals() { return this.store.get().goals; }
  async findGoalById(goalId: string) { return this.store.get().goals.find((item) => item.id === goalId); }
  async createGoal(goal: GrowthGoal) { this.store.update((state) => { state.goals.unshift(goal); }); return goal; }
  async addCheckin(checkin: GrowthGoalCheckin) {
    const goal = await this.findGoalById(checkin.goalId);
    if (!goal) return undefined;
    this.store.update((state) => {
      const target = state.goals.find((item) => item.id === checkin.goalId);
      if (!target) return;
      target.checkins.unshift(checkin);
      target.currentValue = checkin.progressValue ?? target.currentValue;
      target.updatedAt = checkin.createdAt;
    });
    return checkin;
  }
  async listReports() { return this.store.get().reports; }
  async findReportById(reportId: string) { return this.store.get().reports.find((item) => item.id === reportId); }
  async createReport(report: GrowthReport) {
    this.store.update((state) => {
      const existing = state.reports.find((item) => item.id === report.id);
      if (existing) {
        Object.assign(existing, report, { createdAt: existing.createdAt });
        return;
      }
      state.reports.unshift(report);
    });
    return report;
  }
  async updateReport(reportId: string, patch: Partial<GrowthReport>) {
    let updated: GrowthReport | undefined;
    this.store.update((state) => {
      const report = state.reports.find((item) => item.id === reportId);
      if (!report) return;
      Object.assign(report, patch);
      updated = report;
    });
    return updated;
  }
}

class DbGrowthRepository implements GrowthRepositoryPort {
  private readonly db = createDb();

  async listRubrics() {
    const templates = await this.db.select().from(dbSchema.rubricTemplates).orderBy(asc(dbSchema.rubricTemplates.createdAt));
    const dimensions = await this.db.select().from(dbSchema.rubricDimensions).orderBy(asc(dbSchema.rubricDimensions.sortOrder));
    const dimensionsByTemplate = new Map<string, RubricTemplate['dimensions']>();
    for (const dimension of dimensions) {
      const list = dimensionsByTemplate.get(dimension.templateId) ?? [];
      list.push({
        id: dimension.id,
        templateId: dimension.templateId,
        code: dimension.code,
        name: dimension.name,
        weight: this.toNumber(dimension.weight) ?? 1,
        scoreMin: dimension.scoreMin,
        scoreMax: dimension.scoreMax,
        description: dimension.description ?? undefined,
        sortOrder: dimension.sortOrder,
      });
      dimensionsByTemplate.set(dimension.templateId, list);
    }
    return templates.map((row) => this.mapRubric(row, dimensionsByTemplate.get(row.id) ?? []));
  }

  async findRubricById(templateId: string) {
    return (await this.listRubrics()).find((item) => item.id === templateId);
  }

  async createRubric(template: RubricTemplate) {
    await this.db.transaction(async (tx) => {
      await tx.insert(dbSchema.rubricTemplates).values({
        id: template.id,
        campusId: template.campusId ?? null,
        termId: template.termId ?? null,
        name: template.name,
        stageScope: template.stageScope ?? null,
        status: template.status,
        description: template.description ?? null,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      });
      if (template.dimensions.length) {
        await tx.insert(dbSchema.rubricDimensions).values(template.dimensions.map((dimension) => ({
          id: dimension.id,
          templateId: template.id,
          code: dimension.code,
          name: dimension.name,
          weight: String(dimension.weight ?? 1),
          scoreMin: dimension.scoreMin ?? 1,
          scoreMax: dimension.scoreMax ?? 5,
          description: dimension.description ?? null,
          sortOrder: dimension.sortOrder ?? 100,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt),
        })));
      }
    });
    return template;
  }

  async listObservations() {
    const rows = await this.db.select().from(dbSchema.growthObservations).orderBy(asc(dbSchema.growthObservations.createdAt));
    return rows.map((row) => this.mapObservation(row));
  }

  async createObservation(observation: GrowthObservation) {
    const [created] = await this.db.insert(dbSchema.growthObservations).values({
      id: observation.id,
      studentId: observation.studentId,
      termId: observation.termId ?? null,
      teacherId: observation.teacherId ?? null,
      templateId: observation.templateId ?? null,
      observationDate: observation.observationDate,
      scene: observation.scene,
      totalScore: observation.totalScore?.toString() ?? null,
      strengths: observation.strengths ?? null,
      improvementNotes: observation.improvementNotes ?? null,
      publishToFamily: observation.publishToFamily ? 'true' : 'false',
      createdAt: new Date(observation.createdAt),
      updatedAt: new Date(observation.updatedAt),
    }).returning();
    return {
      ...this.mapObservation(created),
      scores: observation.scores,
    };
  }

  async listGoals() {
    const goals = await this.db.select().from(dbSchema.growthGoals).orderBy(asc(dbSchema.growthGoals.createdAt));
    const checkins = await this.db.select().from(dbSchema.growthGoalCheckins).orderBy(asc(dbSchema.growthGoalCheckins.createdAt));
    const checkinsByGoal = new Map<string, GrowthGoalCheckin[]>();
    for (const checkin of checkins) {
      const list = checkinsByGoal.get(checkin.goalId) ?? [];
      list.push(this.mapCheckin(checkin));
      checkinsByGoal.set(checkin.goalId, list);
    }
    return goals.map((row) => this.mapGoal(row, checkinsByGoal.get(row.id) ?? []));
  }

  async findGoalById(goalId: string) {
    return (await this.listGoals()).find((item) => item.id === goalId);
  }

  async createGoal(goal: GrowthGoal) {
    await this.db.insert(dbSchema.growthGoals).values({
      id: goal.id,
      studentId: goal.studentId,
      termId: goal.termId ?? null,
      goalType: goal.goalType,
      title: goal.title,
      description: goal.description ?? null,
      ownerRole: goal.ownerRole,
      metricType: goal.metricType,
      baselineValue: goal.baselineValue?.toString() ?? null,
      targetValue: goal.targetValue?.toString() ?? null,
      currentValue: goal.currentValue?.toString() ?? null,
      startDate: goal.startDate ?? null,
      dueDate: goal.dueDate ?? null,
      status: goal.status,
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
    });
    return goal;
  }

  async addCheckin(checkin: GrowthGoalCheckin) {
    const goal = await this.findGoalById(checkin.goalId);
    if (!goal) return undefined;
    await this.db.transaction(async (tx) => {
      await tx.insert(dbSchema.growthGoalCheckins).values({
        id: checkin.id,
        goalId: checkin.goalId,
        checkinDate: checkin.checkinDate,
        progressValue: checkin.progressValue?.toString() ?? null,
        progressNote: checkin.progressNote ?? null,
        nextAction: checkin.nextAction ?? null,
        createdAt: new Date(checkin.createdAt),
      });
      await tx.update(dbSchema.growthGoals).set({ currentValue: checkin.progressValue?.toString() ?? null, updatedAt: new Date(checkin.createdAt) }).where(eq(dbSchema.growthGoals.id, checkin.goalId));
    });
    return checkin;
  }

  async listReports() {
    const rows = await this.db.select().from(dbSchema.growthReports).orderBy(asc(dbSchema.growthReports.createdAt));
    return rows.map((row) => this.mapReport(row));
  }

  async findReportById(reportId: string) {
    const rows = await this.db.select().from(dbSchema.growthReports).where(eq(dbSchema.growthReports.id, reportId)).limit(1);
    return rows[0] ? this.mapReport(rows[0]) : undefined;
  }

  async createReport(report: GrowthReport) {
    const existing = await this.findReportById(report.id);
    if (existing) {
      return (await this.updateReport(report.id, report))!;
    }
    const [created] = await this.db.insert(dbSchema.growthReports).values({
      id: report.id,
      studentId: report.studentId,
      termId: report.termId ?? null,
      reportType: report.reportType,
      periodKey: report.periodKey,
      status: report.status,
      title: report.title ?? null,
      draftMarkdown: report.draftMarkdown ?? null,
      summaryJson: report.summaryJson ?? {},
      generatedByJobId: report.generatedByJobId ?? null,
      publishedAt: report.publishedAt ? new Date(report.publishedAt) : null,
      createdAt: new Date(report.createdAt),
      updatedAt: new Date(report.updatedAt),
    }).returning();
    return this.mapReport(created);
  }

  async updateReport(reportId: string, patch: Partial<GrowthReport>) {
    const [updated] = await this.db.update(dbSchema.growthReports).set({
      studentId: patch.studentId,
      termId: patch.termId,
      reportType: patch.reportType,
      periodKey: patch.periodKey,
      status: patch.status,
      title: patch.title,
      draftMarkdown: patch.draftMarkdown,
      summaryJson: patch.summaryJson,
      generatedByJobId: patch.generatedByJobId,
      publishedAt: patch.publishedAt ? new Date(patch.publishedAt) : patch.publishedAt === null ? null : undefined,
      updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date(),
    }).where(eq(dbSchema.growthReports.id, reportId)).returning();
    return updated ? this.mapReport(updated) : undefined;
  }

  private mapRubric(row: typeof dbSchema.rubricTemplates.$inferSelect, dimensions: RubricTemplate['dimensions']): RubricTemplate {
    return {
      id: row.id,
      campusId: row.campusId ?? null,
      termId: row.termId ?? null,
      name: row.name,
      stageScope: row.stageScope ?? undefined,
      status: row.status as RubricTemplate['status'],
      description: row.description ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      dimensions,
    };
  }

  private mapObservation(row: typeof dbSchema.growthObservations.$inferSelect): GrowthObservation {
    return {
      id: row.id,
      studentId: row.studentId,
      termId: row.termId ?? null,
      teacherId: row.teacherId ?? null,
      templateId: row.templateId ?? '',
      observationDate: row.observationDate,
      scene: row.scene,
      scores: [],
      totalScore: this.toNumber(row.totalScore) ?? 0,
      strengths: row.strengths ?? undefined,
      improvementNotes: row.improvementNotes ?? undefined,
      publishToFamily: row.publishToFamily === 'true',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapGoal(row: typeof dbSchema.growthGoals.$inferSelect, checkins: GrowthGoalCheckin[]): GrowthGoal {
    return {
      id: row.id,
      studentId: row.studentId,
      termId: row.termId ?? null,
      goalType: row.goalType,
      title: row.title,
      description: row.description ?? undefined,
      ownerRole: row.ownerRole,
      metricType: row.metricType,
      baselineValue: this.toNumber(row.baselineValue) ?? undefined,
      targetValue: this.toNumber(row.targetValue) ?? undefined,
      currentValue: this.toNumber(row.currentValue) ?? undefined,
      startDate: row.startDate ?? undefined,
      dueDate: row.dueDate ?? undefined,
      status: row.status as GrowthGoal['status'],
      checkins,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapCheckin(row: typeof dbSchema.growthGoalCheckins.$inferSelect): GrowthGoalCheckin {
    return {
      id: row.id,
      goalId: row.goalId,
      checkinDate: row.checkinDate,
      progressValue: this.toNumber(row.progressValue) ?? undefined,
      progressNote: row.progressNote ?? undefined,
      nextAction: row.nextAction ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapReport(row: typeof dbSchema.growthReports.$inferSelect): GrowthReport {
    return {
      id: row.id,
      studentId: row.studentId,
      termId: row.termId ?? null,
      reportType: row.reportType as GrowthReport['reportType'],
      periodKey: row.periodKey,
      status: row.status as GrowthReport['status'],
      title: row.title ?? undefined,
      draftMarkdown: row.draftMarkdown ?? undefined,
      summaryJson: (row.summaryJson ?? {}) as Record<string, unknown>,
      generatedByJobId: row.generatedByJobId ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toNumber(value: string | number | null | undefined) {
    if (value == null) return null;
    return typeof value === 'number' ? value : Number(value);
  }
}

@Injectable()
export class GrowthRepository {
  private readonly adapter: GrowthRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbGrowthRepository() : new FileGrowthRepository();
  }

  listRubrics() { return this.adapter.listRubrics(); }
  findRubricById(templateId: string) { return this.adapter.findRubricById(templateId); }
  createRubric(template: RubricTemplate) { return this.adapter.createRubric(template); }
  listObservations() { return this.adapter.listObservations(); }
  createObservation(observation: GrowthObservation) { return this.adapter.createObservation(observation); }
  listGoals() { return this.adapter.listGoals(); }
  findGoalById(goalId: string) { return this.adapter.findGoalById(goalId); }
  createGoal(goal: GrowthGoal) { return this.adapter.createGoal(goal); }
  addCheckin(checkin: GrowthGoalCheckin) { return this.adapter.addCheckin(checkin); }
  listReports() { return this.adapter.listReports(); }
  findReportById(reportId: string) { return this.adapter.findReportById(reportId); }
  createReport(report: GrowthReport) { return this.adapter.createReport(report); }
  updateReport(reportId: string, patch: Partial<GrowthReport>) { return this.adapter.updateReport(reportId, patch); }

  async requireGoalById(goalId: string) {
    const goal = await this.findGoalById(goalId);
    if (!goal) throw new NotFoundException(`Goal ${goalId} not found`);
    return goal;
  }
}
