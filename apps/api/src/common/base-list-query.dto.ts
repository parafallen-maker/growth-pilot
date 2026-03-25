import { baseListQuerySchema } from './validation';

export class BaseListQueryDto {
  static schema = baseListQuerySchema;

  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  campusId?: string;
  termId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function normalizePage(query: BaseListQueryDto) {
  return {
    pageNo: Math.max(Number(query.pageNo) || 1, 1),
    pageSize: Math.max(Number(query.pageSize) || 20, 1),
  };
}
