export class ReviewGrowthReportDto {
  reviewerUserId?: string;
  reviewNote?: string;
  title?: string;
  draftMarkdown?: string;
  summaryJson?: Record<string, unknown>;
}
