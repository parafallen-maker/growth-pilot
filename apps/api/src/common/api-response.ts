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

export interface PageResult<T> {
  list: T[];
  page: PageMeta;
}

export function ok<T>(data: T): ApiResponse<T> {
  return {
    code: 'OK',
    message: 'success',
    data,
    traceId: 'local-dev-trace',
  };
}
