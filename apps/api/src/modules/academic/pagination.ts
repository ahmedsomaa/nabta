import { paginationQuerySchema } from '@nabta/validation';

export function parsePagination(query: unknown): { page: number; limit: number; skip: number } {
  const parsed = paginationQuerySchema.parse(query ?? {});
  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 20;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { page, limit, total } };
}
