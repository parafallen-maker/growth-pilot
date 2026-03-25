import { BaseListQueryDto } from '../../../common/base-list-query.dto';
import { baseListQuerySchema, optionalTrimmedString } from '../../../common/validation';

export class MessageTemplateQueryDto extends BaseListQueryDto {
  static schema = baseListQuerySchema.extend({
    channel: optionalTrimmedString(32),
  }).strict();

  channel?: string;
}
