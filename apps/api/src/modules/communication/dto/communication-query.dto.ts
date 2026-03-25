import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class CommunicationQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    familyId: optionalIdString(),
    studentId: optionalIdString(),
    channel: optionalTrimmedString(32),
  }).strict();

  familyId?: string;
  studentId?: string;
  channel?: string;
}
