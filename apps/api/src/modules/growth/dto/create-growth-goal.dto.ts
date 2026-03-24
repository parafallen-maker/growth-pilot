export class CreateGrowthGoalDto {
  studentId!: string;
  termId?: string;
  goalType!: string;
  title!: string;
  description?: string;
  ownerRole?: string;
  metricType?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  startDate?: string;
  dueDate?: string;
  status?: string;
}
