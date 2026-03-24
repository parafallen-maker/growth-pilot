import { Injectable } from '@nestjs/common';
import type { GrowthGoal, GrowthObservation } from '@growthpilot/schema/index';
import { GrowthRepository } from '../repository/growth.repository';

@Injectable()
export class ReportMaterialAssembler {
  constructor(private readonly growthRepository: GrowthRepository) {}

  assemble(studentId: string, periodKey: string) {
    const observations = this.growthRepository.listObservations().filter((item) => item.studentId === studentId);
    const goals = this.growthRepository.listGoals().filter((item) => item.studentId === studentId);

    return {
      studentId,
      periodKey,
      homeworkSummary: { placeholder: true },
      growthObservations: observations.map((item: GrowthObservation) => ({
        id: item.id,
        observationDate: item.observationDate,
        scene: item.scene,
        totalScore: item.totalScore,
        strengths: item.strengths,
        improvementNotes: item.improvementNotes,
      })),
      goals: goals.map((item: GrowthGoal) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        currentValue: item.currentValue,
        targetValue: item.targetValue,
        latestCheckin: item.checkins[0] ?? null,
      })),
      praiseRecords: [],
      familyTasks: [],
    };
  }
}
