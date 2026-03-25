import { optionalDateString, optionalIdString, strictObject } from '../../../common/validation';

export class AnalyticsQueryDto {
  static schema = strictObject({
    campusId: optionalIdString(),
    termId: optionalIdString(),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
    teacherId: optionalIdString(),
  });

  campusId?: string;
  termId?: string;
  dateFrom?: string;
  dateTo?: string;
  teacherId?: string;
}
