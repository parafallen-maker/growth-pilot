import { Injectable } from '@nestjs/common';
import type { GrowthGoal, GrowthObservation } from '@growthpilot/schema/index';
import { GrowthRepository } from '../repository/growth.repository';

@Injectable()
export class ReportMaterialAssembler {
  constructor(private readonly growthRepository: GrowthRepository) {}

  async assemble(studentId: string, periodKey: string) {
    const observations = (await this.growthRepository.listObservations()).filter((item) => item.studentId === studentId);
    const goals = (await this.growthRepository.listGoals()).filter((item) => item.studentId === studentId);

    return {
      studentId,
      periodKey,
      homeworkSummary: { placeholder: true },
      materialRefs: {
        observationIds: observations.map((item) => item.id),
        goalIds: goals.map((item) => item.id),
      },
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
