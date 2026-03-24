export interface HomeworkReviewErrorItemDto {
  errorTaxonomyId: string;
  weight?: number;
  note?: string;
}

export class HomeworkReviewDto {
  reviewResult!: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number;
  finalErrorItems?: HomeworkReviewErrorItemDto[];
  finalErrorSummary?: string;
  finalSuggestion?: string;
  publishToFamily?: boolean;
  reviewerTeacherId?: string;
}
