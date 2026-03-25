import { enumValue, optionalBooleanValue, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

export class HomeworkReviewErrorItemDto {
  static schema = strictObject({
    errorTaxonomyId: trimmedString(1, 64),
    weight: optionalIntegerNumber(0, 100),
    note: optionalTrimmedString(255),
  });

  errorTaxonomyId!: string;
  weight?: number;
  note?: string;
}

export class HomeworkReviewDto {
  static schema = strictObject({
    reviewResult: enumValue(['approved', 'adjusted', 'rejected']),
    finalAccuracyPct: optionalIntegerNumber(0, 100),
    finalErrorItems: zod.array(HomeworkReviewErrorItemDto.schema).max(50).optional(),
    finalErrorSummary: optionalTrimmedString(1000),
    finalSuggestion: optionalTrimmedString(1000),
    publishToFamily: optionalBooleanValue(),
    reviewerTeacherId: optionalIdString(),
  });

  reviewResult!: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number;
  finalErrorItems?: Array<HomeworkReviewErrorItemDto>;
  finalErrorSummary?: string;
  finalSuggestion?: string;
  publishToFamily?: boolean;
  reviewerTeacherId?: string;
}
