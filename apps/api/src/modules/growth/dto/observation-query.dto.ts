import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalEnumValue, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class ObservationQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    teacherId: optionalIdString(),
    scene: optionalTrimmedString(64),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
    reportPublished: optionalEnumValue(['all', 'published', 'unpublished']),
  }).strict();

  studentId?: string;
  teacherId?: string;
  scene?: string;
  dateFrom?: string;
  dateTo?: string;
  reportPublished?: 'all' | 'published' | 'unpublished';
}
