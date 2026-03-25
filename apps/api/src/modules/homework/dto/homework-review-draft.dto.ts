import { enumValue, optionalBooleanValue, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

export class HomeworkReviewDraftErrorItemDto {
  static schema = strictObject({
    errorTaxonomyId: trimmedString(1, 64),
    weight: optionalIntegerNumber(0, 100),
    note: optionalTrimmedString(255),
  });

  errorTaxonomyId!: string;
  weight?: number;
  note?: string;
}

export class HomeworkReviewDraftDto {
  static schema = strictObject({
    reviewResult: enumValue(['approved', 'adjusted', 'rejected']).optional(),
    finalAccuracyPct: optionalIntegerNumber(0, 100),
    finalErrorItems: zod.array(HomeworkReviewDraftErrorItemDto.schema).max(50).optional(),
    finalErrorSummary: optionalTrimmedString(1000),
    finalSuggestion: optionalTrimmedString(1000),
    publishToFamily: optionalBooleanValue(),
    reviewerTeacherId: optionalIdString(),
  });

  reviewResult?: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number;
  finalErrorItems?: Array<HomeworkReviewDraftErrorItemDto>;
  finalErrorSummary?: string;
  finalSuggestion?: string;
  publishToFamily?: boolean;
  reviewerTeacherId?: string;
}
