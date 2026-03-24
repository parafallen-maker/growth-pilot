import { Injectable } from '@nestjs/common';
import type {
  GrowthGoal,
  GrowthGoalCheckin,
  GrowthObservation,
  GrowthReport,
  RubricTemplate,
} from '@growthpilot/schema/index';

@Injectable()
export class GrowthRepository {
  private readonly rubricTemplates: RubricTemplate[] = [
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
  ];

  private readonly observations: GrowthObservation[] = [
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
  ];

  private readonly goals: GrowthGoal[] = [
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
  ];

  private readonly reports: GrowthReport[] = [];
  private readonly jobs: Array<{ jobId: string; request: Record<string, unknown>; status: string; createdAt: string }> = [];

  listRubrics() { return this.rubricTemplates; }
  findRubricById(templateId: string) { return this.rubricTemplates.find((item) => item.id === templateId); }
  createRubric(template: RubricTemplate) { this.rubricTemplates.unshift(template); return template; }

  listObservations() { return this.observations; }
  createObservation(observation: GrowthObservation) { this.observations.unshift(observation); return observation; }

  listGoals() { return this.goals; }
  findGoalById(goalId: string) { return this.goals.find((item) => item.id === goalId); }
  createGoal(goal: GrowthGoal) { this.goals.unshift(goal); return goal; }
  addCheckin(checkin: GrowthGoalCheckin) {
    const goal = this.findGoalById(checkin.goalId);
    if (!goal) return undefined;
    goal.checkins.unshift(checkin);
    goal.currentValue = checkin.progressValue ?? goal.currentValue;
    goal.updatedAt = checkin.createdAt;
    return checkin;
  }

  listReports() { return this.reports; }
  createReport(report: GrowthReport) { this.reports.unshift(report); return report; }

  createReportJob(job: { jobId: string; request: Record<string, unknown>; status: string; createdAt: string }) {
    this.jobs.unshift(job);
    return job;
  }
}
