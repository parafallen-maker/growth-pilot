export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export class BaseListQueryDto {
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
    pageSize: Math.min(Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE),
  };
}
