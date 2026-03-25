import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class MessageTaskQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    familyId: optionalIdString(),
    studentId: optionalIdString(),
    channel: optionalTrimmedString(32),
    status: optionalTrimmedString(32),
    keyword: optionalTrimmedString(100),
  }).strict();

  familyId?: string;
  studentId?: string;
  channel?: string;
  declare status?: string;
  declare keyword?: string;
}
