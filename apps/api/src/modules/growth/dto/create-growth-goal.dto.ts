import { dateString, optionalDateString, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateGrowthGoalDto {
  static schema = strictObject({
    studentId: trimmedString(1, 64),
    termId: optionalIdString(),
    goalType: trimmedString(1, 64),
    title: trimmedString(1, 128),
    description: optionalTrimmedString(1000),
    ownerRole: optionalTrimmedString(64),
    metricType: optionalTrimmedString(64),
    baselineValue: optionalIntegerNumber(),
    targetValue: optionalIntegerNumber(),
    currentValue: optionalIntegerNumber(),
    startDate: optionalDateString(),
    dueDate: optionalDateString(),
    status: optionalTrimmedString(32),
  });

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
