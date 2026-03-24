import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class ObservationQueryDto extends BaseListQueryDto {
  studentId?: string;
  teacherId?: string;
  scene?: string;
  dateFrom?: string;
  dateTo?: string;
}
