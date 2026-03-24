export class CreateGrowthObservationDto {
  studentId!: string;
  termId?: string;
  teacherId?: string;
  templateId!: string;
  observationDate!: string;
  scene!: string;
  scores!: Array<{
    dimensionId: string;
    score: number;
    note?: string;
  }>;
  strengths?: string;
  improvementNotes?: string;
  publishToFamily?: boolean;
}
