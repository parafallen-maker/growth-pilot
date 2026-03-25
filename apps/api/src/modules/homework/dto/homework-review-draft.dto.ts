export interface HomeworkReviewDraftErrorItemDto {
  errorTaxonomyId: string;
  weight?: number;
  note?: string;
}

export class HomeworkReviewDraftDto {
  reviewResult?: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number;
  finalErrorItems?: HomeworkReviewDraftErrorItemDto[];
  finalErrorSummary?: string;
  finalSuggestion?: string;
  publishToFamily?: boolean;
  reviewerTeacherId?: string;
}
