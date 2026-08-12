'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/lib/pagination'

export function PaginationFooter({ pagination, onPageChange, loading = false }: { pagination: PaginationMeta; onPageChange: (page: number) => void; loading?: boolean }) {
  const first = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const last = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return (
    <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-xs text-muted-foreground sm:text-left">
        {first}-{last} sur {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!pagination.hasPreviousPage || loading} onClick={() => onPageChange(pagination.page - 1)} aria-label="Page précédente">
          <ChevronLeft className="size-4 sm:mr-1" /><span className="hidden sm:inline">Précédent</span>
        </Button>
        <span className="min-w-20 text-center text-xs font-medium">Page {pagination.page} / {pagination.pageCount}</span>
        <Button type="button" size="sm" variant="outline" disabled={!pagination.hasNextPage || loading} onClick={() => onPageChange(pagination.page + 1)} aria-label="Page suivante">
          <span className="hidden sm:inline">Suivant</span><ChevronRight className="size-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  )
}
