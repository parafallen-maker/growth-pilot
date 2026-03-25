import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class AttendanceEventQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    campusId: optionalIdString(),
    eventType: optionalTrimmedString(32),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
    deviceId: optionalIdString(),
  }).strict();

  studentId?: string;
  declare campusId?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  deviceId?: string;
}
