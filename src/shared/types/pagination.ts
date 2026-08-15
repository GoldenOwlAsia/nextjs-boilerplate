export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type SortOrder = 'asc' | 'desc';
