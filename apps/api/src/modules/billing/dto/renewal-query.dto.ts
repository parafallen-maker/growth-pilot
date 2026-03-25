import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString } from '../../../common/validation';

export class RenewalQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    ownerUserId: optionalIdString(),
    familyId: optionalIdString(),
    studentId: optionalIdString(),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  ownerUserId?: string;
  familyId?: string;
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
}
