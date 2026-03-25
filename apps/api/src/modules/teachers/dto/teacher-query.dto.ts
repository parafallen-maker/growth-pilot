import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalTrimmedString } from '../../../common/validation';

export class TeacherQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    subject: optionalTrimmedString(64),
  }).strict();

  subject?: string;
}
