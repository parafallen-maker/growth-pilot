import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class HomeworkSubmissionQueryDto extends BaseListQueryDto {
  teacherId?: string;
  subject?: string;
  aiStatus?: string;
  reviewStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}
