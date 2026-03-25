import { booleanValue, dateString, integerNumber, optionalBooleanValue, optionalDateString, optionalIdString, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

class GrowthObservationScoreDto {
  static schema = strictObject({
    dimensionId: trimmedString(1, 64),
    score: integerNumber(0, 100),
    note: optionalTrimmedString(255),
  });

  dimensionId!: string;
  score!: number;
  note?: string;
}

export class CreateGrowthObservationDto {
  static schema = strictObject({
    studentId: trimmedString(1, 64),
    termId: optionalIdString(),
    teacherId: optionalIdString(),
    templateId: trimmedString(1, 64),
    observationDate: dateString(),
    scene: trimmedString(1, 64),
    scores: zod.array(GrowthObservationScoreDto.schema).min(1).max(20),
    strengths: optionalTrimmedString(1000),
    improvementNotes: optionalTrimmedString(1000),
    publishToFamily: optionalBooleanValue(),
  });

  studentId!: string;
  termId?: string;
  teacherId?: string;
  templateId!: string;
  observationDate!: string;
  scene!: string;
  scores!: Array<GrowthObservationScoreDto>;
  strengths?: string;
  improvementNotes?: string;
  publishToFamily?: boolean;
}
