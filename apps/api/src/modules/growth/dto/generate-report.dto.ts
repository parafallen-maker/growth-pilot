import { enumValue, optionalIdString, strictObject, stringArray, trimmedString } from '../../../common/validation';

export class GenerateGrowthReportDto {
  static schema = strictObject({
    reportType: enumValue(['weekly', 'monthly']),
    periodKey: trimmedString(1, 32),
    studentIds: stringArray(trimmedString(1, 64), 1, 100),
    termId: optionalIdString(),
    campusId: optionalIdString(),
  });

  reportType!: 'weekly' | 'monthly';
  periodKey!: string;
  studentIds!: string[];
  termId?: string;
  campusId?: string;
}
