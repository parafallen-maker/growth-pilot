import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalIdString, optionalTrimmedString } from '../../../common/validation';

export class ReportQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    reportType: optionalTrimmedString(32),
    periodKey: optionalTrimmedString(32),
  }).strict();

  studentId?: string;
  reportType?: string;
  periodKey?: string;
}
