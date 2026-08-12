export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export function parsePagination(searchParams: URLSearchParams, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const requestedPage = Number(searchParams.get('page'))
  const requestedSize = Number(searchParams.get('pageSize'))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = Number.isInteger(requestedSize) && requestedSize > 0
    ? Math.min(requestedSize, MAX_PAGE_SIZE)
    : defaultPageSize
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return {
    page,
    pageSize,
    total,
    pageCount,
    hasPreviousPage: page > 1,
    hasNextPage: page < pageCount,
  }
}

export type PaginationMeta = ReturnType<typeof paginationMeta>
