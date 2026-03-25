import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class DeviceBindingQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    deviceId: optionalIdString(),
    status: optionalTrimmedString(32),
  }).strict();

  studentId?: string;
  deviceId?: string;
  declare status?: string;
}
