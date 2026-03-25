import { baseListQuerySchema } from '../../../common/validation';

export class ListUsersQueryDto {
  static schema = baseListQuerySchema;

  pageNo?: number;
  pageSize?: number;
  keyword?: string;
}
