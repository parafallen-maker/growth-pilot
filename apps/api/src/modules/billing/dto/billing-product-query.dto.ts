import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalTrimmedString } from '../../../common/validation';

export class BillingProductQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    category: optionalTrimmedString(64),
  }).strict();

  category?: string;
}
