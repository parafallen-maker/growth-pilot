import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class DeviceQueryDto extends BaseListQueryDto {
  declare campusId?: string;
  deviceType?: string;
  declare status?: string;
}
