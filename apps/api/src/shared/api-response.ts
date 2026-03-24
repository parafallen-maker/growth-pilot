export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  traceId: string;
}

export interface PageMeta {
  pageNo: number;
  pageSize: number;
  total: number;
}

export interface PagedResult<T> {
  list: T[];
  page: PageMeta;
}

export function buildApiResponse<T>(data: T, traceId = 'trace-mock-001'): ApiResponse<T> {
  return {
    code: 'OK',
    message: 'success',
    data,
    traceId,
  };
}

export function buildPagedResult<T>(list: T[], pageNo = 1, pageSize = list.length || 20): PagedResult<T> {
  return {
    list,
    page: {
      pageNo,
      pageSize,
      total: list.length,
    },
  };
}
