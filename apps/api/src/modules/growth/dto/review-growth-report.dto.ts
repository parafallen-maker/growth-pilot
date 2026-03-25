import { optionalIdString, optionalTrimmedString, strictObject, zod } from '../../../common/validation';

export class ReviewGrowthReportDto {
  static schema = strictObject({
    reviewerUserId: optionalIdString(),
    reviewNote: optionalTrimmedString(1000),
    title: optionalTrimmedString(255),
    draftMarkdown: optionalTrimmedString(20_000),
    summaryJson: zod.record(zod.string(), zod.unknown()).optional(),
  });

  reviewerUserId?: string;
  reviewNote?: string;
  title?: string;
  draftMarkdown?: string;
  summaryJson?: Record<string, unknown>;
}
