import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class DeviceQueryDto extends BaseListQueryDto {
  deviceType?: string;
}
