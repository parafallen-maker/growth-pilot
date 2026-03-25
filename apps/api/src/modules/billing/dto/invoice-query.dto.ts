import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalDateString } from '../../../common/validation';

export class InvoiceQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
  }).strict();

  dateFrom?: string;
  dateTo?: string;
}
