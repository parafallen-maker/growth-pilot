import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString, optionalTrimmedString, optionalEnumValue } from '../../../common/validation';

export class TaskQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    ownerUserId: optionalIdString(),
    studentId: optionalIdString(),
    familyId: optionalIdString(),
    teacherId: optionalIdString(),
    taskType: optionalTrimmedString(64),
    priority: optionalEnumValue(['low', 'medium', 'high']),
    status: optionalEnumValue(['open', 'in_progress', 'done']),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  ownerUserId?: string;
  studentId?: string;
  familyId?: string;
  teacherId?: string;
  taskType?: string;
  priority?: 'low' | 'medium' | 'high';
  declare status?: 'open' | 'in_progress' | 'done';
  dateFrom?: string;
  dateTo?: string;
}
