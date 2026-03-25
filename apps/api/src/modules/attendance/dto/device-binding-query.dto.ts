import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class DeviceBindingQueryDto extends BaseListQueryDto {
  studentId?: string;
  deviceId?: string;
  declare status?: string;
}
