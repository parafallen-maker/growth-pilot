export type QueryBase = {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  campusId?: string;
  termId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PageResult<T> = {
  list: T[];
  page: {
    pageNo: number;
    pageSize: number;
    total: number;
  };
};

export type AsyncState = 'loading' | 'empty' | 'error' | 'forbidden' | 'ready';
