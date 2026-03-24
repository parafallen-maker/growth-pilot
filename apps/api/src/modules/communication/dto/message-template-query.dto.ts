import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class MessageTemplateQueryDto extends BaseListQueryDto {
  channel?: string;
}
