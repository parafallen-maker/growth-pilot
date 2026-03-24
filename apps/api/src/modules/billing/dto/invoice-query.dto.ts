import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class InvoiceQueryDto extends BaseListQueryDto {
  dateFrom?: string;
  dateTo?: string;
}
