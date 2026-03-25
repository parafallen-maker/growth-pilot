import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class AttendanceEventQueryDto extends BaseListQueryDto {
  studentId?: string;
  declare campusId?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  deviceId?: string;
}
