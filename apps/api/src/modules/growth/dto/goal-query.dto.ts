import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class GoalQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    goalType: optionalTrimmedString(64),
  }).strict();

  studentId?: string;
  goalType?: string;
}
