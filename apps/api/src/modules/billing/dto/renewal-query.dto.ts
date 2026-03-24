import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class RenewalQueryDto extends BaseListQueryDto {
  ownerUserId?: string;
  familyId?: string;
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
}
