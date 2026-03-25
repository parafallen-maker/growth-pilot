import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class HomeworkSubmissionQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    teacherId: optionalIdString(),
    subject: optionalTrimmedString(64),
    aiStatus: optionalTrimmedString(32),
    reviewStatus: optionalTrimmedString(32),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  teacherId?: string;
  subject?: string;
  aiStatus?: string;
  reviewStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}
