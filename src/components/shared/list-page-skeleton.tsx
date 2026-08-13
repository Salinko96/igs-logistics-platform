import { Skeleton } from '@/components/ui/skeleton'

export function ListPageSkeleton({ cards = 3, rows = 8 }: { cards?: number; rows?: number }) {
  return (
    <div className="space-y-5" aria-label="Chargement en cours" aria-busy="true">
      <div className="flex items-center justify-between gap-4"><div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-10 w-36" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: cards }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
      <div className="overflow-hidden rounded-xl border"><Skeleton className="h-14 w-full rounded-none" />{Array.from({ length: rows }).map((_, index) => <div key={index} className="flex gap-4 border-t p-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-20" /></div>)}</div>
    </div>
  )
}
