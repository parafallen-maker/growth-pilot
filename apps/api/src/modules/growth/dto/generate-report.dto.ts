export class GenerateGrowthReportDto {
  reportType!: 'weekly' | 'monthly';
  periodKey!: string;
  studentIds!: string[];
  termId?: string;
  campusId?: string;
}
