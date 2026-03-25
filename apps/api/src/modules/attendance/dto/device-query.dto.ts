import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class DeviceQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    campusId: optionalIdString(),
    deviceType: optionalTrimmedString(32),
    status: optionalTrimmedString(32),
  }).strict();

  declare campusId?: string;
  deviceType?: string;
  declare status?: string;
}
