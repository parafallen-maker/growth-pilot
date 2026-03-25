import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class StudentQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    teacherId: optionalIdString(),
    grade: optionalTrimmedString(32),
  }).strict();

  teacherId?: string;
  grade?: string;
}
