import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class HomeworkTimeDailyStatsQueryDto extends BaseListQueryDto {
  studentId?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
}
