import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class CommunicationQueryDto extends BaseListQueryDto {
  familyId?: string;
  studentId?: string;
  channel?: string;
}
