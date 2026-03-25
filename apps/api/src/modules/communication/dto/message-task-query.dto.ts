import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class MessageTaskQueryDto extends BaseListQueryDto {
  familyId?: string;
  studentId?: string;
  channel?: string;
  declare status?: string;
  declare keyword?: string;
}
