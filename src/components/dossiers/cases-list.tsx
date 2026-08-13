'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Plus,
  Ship,
  Plane,
  Truck,
  GitBranch,
  ArrowUpDown,
  FolderOpen,
  AlertTriangle,
  Clock,
  Ban,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  CASE_TYPES,
  formatDate,
  CASE_STATUSES,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { PaginationFooter } from '@/components/shared/pagination-footer'
import type { PaginationMeta } from '@/lib/pagination'
import { PageHero } from '@/components/shared/page-hero'

// ─── Types ───────────────────────────────────────────────

interface CasesListProps {
  filter?: { type?: string; status?: string; scope?: string; search?: string }
}

interface CaseItem {
  id: string
  reference: string
  type: string
  direction: string
  status: string
  priority: string
  merchandise: string | null
  eta: string | null
  createdAt: string
  updatedAt: string
  client: { name: string }
  serviceChef: { firstName: string; lastName: string } | null
  commercial: { firstName: string; lastName: string } | null
  weightKg: number | null
  packageCount: number | null
  riskLevel: string
}

// ─── Helpers ─────────────────────────────────────────────

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  maritime: Ship,
  aerien: Plane,
  terrestre: Truck,
  multimodal: GitBranch,
}

const TYPE_LABEL_MAP: Record<string, string> = {
  maritime: 'Maritime',
  aerien: 'Aérien',
  terrestre: 'Terrestre',
  multimodal: 'Multimodal',
}

const DIRECTION_LABEL_MAP: Record<string, string> = {
  import: 'Import',
  export: 'Export',
  transit: 'Transit',
}

const DIRECTION_COLOR_MAP: Record<string, string> = {
  import: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  export: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  transit: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

function getTypeLabel(type: string): string {
  return TYPE_LABEL_MAP[type] || type
}

function getDirectionLabel(direction: string): string {
  return DIRECTION_LABEL_MAP[direction] || direction
}

function getDirectionColor(direction: string): string {
  return DIRECTION_COLOR_MAP[direction] || 'bg-gray-100 text-gray-700'
}

/** Top 10 most operationally relevant statuses for the filter dropdown */
const TOP_STATUSES = [
  'brouillon',
  'demande_recue',
  'devis_envoye',
  'commande_confirme',
  'en_preparation',
  'en_transit',
  'arrive_au_port',
  'en_dedouanement',
  'en_livraison',
  'livre',
  'cloture',
  'suspendu',
]

// ─── Component ───────────────────────────────────────────

export default function CasesList({ filter }: CasesListProps) {
  const { t } = useI18n()
  const setView = useAppStore((s) => s.setView)

  // ── Local filter state ──
  const [search, setSearch] = useState(filter?.search || '')
  const [typeFilter, setTypeFilter] = useState<string>(filter?.type || 'tous')
  const [statusFilter, setStatusFilter] = useState<string>(filter?.status || 'tous')
  const [sortField, setSortField] = useState<'updatedAt' | 'createdAt' | 'reference'>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  // Initial state from filter prop — works because AnimatePresence remounts on view change

  const debouncedSearch = useDebouncedValue(search)

  // ── Build query URL ──
  const queryUrl = (() => {
    const params = new URLSearchParams()
    if (typeFilter && typeFilter !== 'tous') params.set('type', typeFilter)
    if (statusFilter && statusFilter !== 'tous') params.set('status', statusFilter)
    if (filter?.scope) params.set('scope', filter.scope)
    if (debouncedSearch) params.set('search', debouncedSearch)
    params.set('page', String(page))
    params.set('pageSize', '20')
    params.set('sort', sortField)
    params.set('direction', sortDir)
    const qs = params.toString()
    return `/api/cases${qs ? `?${qs}` : ''}`
  })()

  // ── Fetch data ──
  const { data, isLoading, isFetching, isError } = useQuery<{ items: CaseItem[]; pagination: PaginationMeta; summary: { active: number; urgent: number; blocked: number } }>({
    queryKey: ['cases', typeFilter, statusFilter, debouncedSearch, filter?.scope, page, sortField, sortDir],
    queryFn: () => fetch(queryUrl).then((r) => {
      if (!r.ok) throw new Error('Erreur de chargement')
      return r.json()
    }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
  const cases = data?.items ?? []

  // ── Computed stats ──
  const stats = useMemo(() => {
    return { active: data?.summary.active ?? 0, urgents: data?.summary.urgent ?? 0, blocked: data?.summary.blocked ?? 0 }
  }, [data?.summary])

  // ── Title ──
  const title = useMemo(() => {
    if (filter?.scope === 'active') return 'Dossiers actifs'
    if (filter?.scope === 'blocked') return 'Dossiers bloqués'
    if (filter?.scope === 'urgent') return 'Dossiers urgents'
    if (filter?.type) {
      const typeLabel = CASE_TYPES.find((t) => t.value === filter.type)
      return typeLabel ? `${t(`type.${typeLabel.value}`)} ${t('screen.cases').toLowerCase()}` : t('screen.cases')
    }
    return t('screen.cases')
  }, [filter, t])

  // ── Sort toggle helper ──
  const toggleSort = useCallback(
    (field: typeof sortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
      setPage(1)
    },
    [sortField],
  )

  // ── Row click ──
  const handleRowClick = useCallback(
    (id: string) => {
      setView('case-detail', { id })
    },
    [setView],
  )

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <PageHero eyebrow="Centre opérationnel" title={title} description="Centralisez les expéditions, priorités, blocages et responsabilités de chaque dossier." actions={<Button
          type="button"
          onClick={() => setView('case-new')}
          className="shrink-0"
        >
          <Plus className="mr-2 size-4" />
          {t('action.newCase')}
        </Button>} />

      {/* ─── Filters Bar ─── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par réf, client, marchandise..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-1.5">
                      {(() => { const Icon = TYPE_ICON_MAP[t.value]; return Icon ? <Icon className="size-3" /> : null })()}
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {TOP_STATUSES.map((s) => {
                  const statusDef = CASE_STATUSES.find((cs) => cs.value === s)
                  return (
                    <SelectItem key={s} value={s}>
                      {statusDef?.label || s}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Stats Bar ─── */}
      {!isLoading && cases.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm dark:bg-card">
            <Clock className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{stats.active}</span>
            <span className="text-muted-foreground">dossiers actifs</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm dark:bg-card">
            <AlertTriangle className="size-4 text-orange-500" />
            <span className="font-medium text-foreground">{stats.urgents}</span>
            <span className="text-muted-foreground">urgents</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm dark:bg-card">
            <Ban className="size-4 text-red-500" />
            <span className="font-medium text-foreground">{stats.blocked}</span>
            <span className="text-muted-foreground">bloqués</span>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort('reference')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Référence
                      <ArrowUpDown className="size-3 opacity-50" />
                    </span>
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Client
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Direction
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Marchandise
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Priorité
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Responsable
                  </th>
                  <th
                    className="hidden cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground sm:table-cell"
                    onClick={() => toggleSort('updatedAt')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date MAJ
                      <ArrowUpDown className="size-3 opacity-50" />
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {isLoading ? (
                  // ── Loading skeleton ──
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="even:bg-muted/20">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <AlertTriangle className="size-10 stroke-1" />
                        <p className="text-sm font-medium">Erreur de chargement des dossiers</p>
                        <p className="text-xs">Veuillez réessayer ultérieurement.</p>
                      </div>
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <FolderOpen className="size-10 stroke-1" />
                        <p className="text-sm font-medium">Aucun dossier trouvé</p>
                        <p className="text-xs">
                          {search || typeFilter !== 'tous' || statusFilter !== 'tous'
                            ? 'Essayez de modifier vos filtres de recherche.'
                            : 'Commencez par créer votre premier dossier.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((c, idx) => (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c.id)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-900/10',
                        idx % 2 === 1 && 'bg-muted/20',
                      )}
                    >
                      {/* Reference */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className="font-semibold text-foreground hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowClick(c.id)
                          }}
                        >
                          {c.reference}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="hidden max-w-[180px] truncate whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">
                        {c.client?.name || '—'}
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 font-medium',
                            c.type === 'maritime' && 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300',
                            c.type === 'aerien' && 'border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300',
                            c.type === 'terrestre' && 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300',
                            c.type === 'multimodal' && 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300',
                          )}
                        >
                          {(() => { const Icon = TYPE_ICON_MAP[c.type]; return Icon ? <Icon className="size-3" /> : null })()}
                          {getTypeLabel(c.type)}
                        </Badge>
                      </td>

                      {/* Direction */}
                      <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn('text-[11px] font-medium', getDirectionColor(c.direction))}
                        >
                          {getDirectionLabel(c.direction)}
                        </Badge>
                      </td>

                      {/* Merchandise */}
                      <td className="hidden max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">
                        {c.merchandise || '—'}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn('text-[11px] font-medium', getStatusColor(c.status))}
                        >
                          {getStatusLabel(c.status)}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn('text-[11px] font-medium', getPriorityColor(c.priority))}
                        >
                          {getPriorityLabel(c.priority)}
                        </Badge>
                      </td>

                      {/* Responsable */}
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">
                        {c.serviceChef
                          ? `${c.serviceChef.firstName} ${c.serviceChef.lastName}`
                          : c.commercial
                            ? `${c.commercial.firstName} ${c.commercial.lastName}`
                            : '—'}
                      </td>

                      {/* Date MAJ */}
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(c.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination ? <PaginationFooter pagination={data.pagination} onPageChange={setPage} loading={isFetching} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
