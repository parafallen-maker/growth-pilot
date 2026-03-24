import { BaseListQueryDto } from '../../../common/base-list-query.dto';

export class StudentQueryDto extends BaseListQueryDto {
  teacherId?: string;
  grade?: string;
}
