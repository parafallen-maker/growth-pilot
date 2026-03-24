import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class TeacherQueryDto extends BaseListQueryDto {
  subject?: string;
}
