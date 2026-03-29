import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString, optionalIdString, optionalTrimmedString, optionalEnumValue } from '../../../common/validation';

export class AlertQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    studentId: optionalIdString(),
    familyId: optionalIdString(),
    invoiceId: optionalIdString(),
    alertType: optionalTrimmedString(64),
    alertLevel: optionalEnumValue(['low', 'medium', 'high']),
    status: optionalEnumValue(['open', 'acknowledged', 'resolved']),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  studentId?: string;
  familyId?: string;
  invoiceId?: string;
  alertType?: string;
  alertLevel?: 'low' | 'medium' | 'high';
  declare status?: 'open' | 'acknowledged' | 'resolved';
  dateFrom?: string;
  dateTo?: string;
}
