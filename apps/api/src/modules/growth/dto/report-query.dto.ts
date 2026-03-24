import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class ReportQueryDto extends BaseListQueryDto {
  studentId?: string;
  reportType?: string;
  periodKey?: string;
}
