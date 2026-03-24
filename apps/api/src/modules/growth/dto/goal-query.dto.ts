import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class GoalQueryDto extends BaseListQueryDto {
  studentId?: string;
  goalType?: string;
}
