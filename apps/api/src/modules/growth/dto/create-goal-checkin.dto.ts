import { dateString, optionalIntegerNumber, optionalTrimmedString, strictObject } from '../../../common/validation';

export class CreateGoalCheckinDto {
  static schema = strictObject({
    checkinDate: dateString(),
    progressValue: optionalIntegerNumber(),
    progressNote: optionalTrimmedString(1000),
    nextAction: optionalTrimmedString(1000),
  });

  checkinDate!: string;
  progressValue?: number;
  progressNote?: string;
  nextAction?: string;
}
