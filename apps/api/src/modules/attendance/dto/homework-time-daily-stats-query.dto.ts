import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class HomeworkTimeDailyStatsQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    subject: optionalTrimmedString(64),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  studentId?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
}
