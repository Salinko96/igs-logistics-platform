'use client'

import { useQuery } from '@tanstack/react-query'
import { readJson } from '@/lib/http'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  formatGNF,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  CASE_TYPES,
  SEVERITY_LEVELS,
} from '@/lib/constants'
import {
  FolderOpen,
  AlertOctagon,
  AlertTriangle,
  Wallet,
  TrendingUp,
  FileWarning,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'

// ─── Types ───

interface DashboardData {
  totalCases: number
  activeCases: number
  blockedCases: number
  urgentCases: number
  casesByType: { type: string; count: number }[]
  casesByStatus: { status: string; count: number }[]
  expensesPending: number
  totalRevenue: number
  totalUnpaid: number
  invoicesOverdue: number
  incidentsOpen: number
  recentCases: {
    id: string
    reference: string
    status: string
    priority: string
    type: string
    direction: string
    merchandise: string | null
    eta: string | null
    createdAt: string
    client: { name: string }
    serviceChef: { firstName: string; lastName: string }
  }[]
  recentIncidents: {
    id: string
    title: string
    severity: string
    status: string
    createdAt: string
    case: { id: string; reference: string; client: { name: string } } | null
  }[]
  revenueByMonth: { month: string; revenue: number }[]
}

// ─── Helpers ───

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function getTypeLabel(type: string): string {
  const found = CASE_TYPES.find((t) => t.value === type)
  return found ? found.label : type
}

function getSeverityColor(severity: string): string {
  const found = SEVERITY_LEVELS.find((s) => s.value === severity)
  return found ? found.color : 'bg-gray-100 text-gray-700'
}

function getSeverityLabel(severity: string): string {
  const found = SEVERITY_LEVELS.find((s) => s.value === severity)
  return found ? found.label : severity
}

function getIncidentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ouvert: 'Ouvert',
    en_cours: 'En cours',
    resolu: 'Résolu',
    'clôturé': 'Clôturé',
  }
  return map[status] ?? status
}

function getIncidentStatusColor(status: string): string {
  const map: Record<string, string> = {
    ouvert: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    en_cours:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    resolu:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'clôturé':
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

function formatMonthLabel(month: string): string {
  const d = new Date(month + '-01')
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

// ─── Custom Tooltips ───

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{formatGNF(payload[0].value)}</p>
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">
        {getTypeLabel(data.name)}: {data.value}
      </p>
    </div>
  )
}

// ─── Loading Skeleton ───

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-[300px] w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="h-[300px] w-full rounded-full" />
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="mb-4 h-5 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Card ───

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  onClick?: () => void
}

function KpiCard({ label, value, icon, iconBg, iconColor, onClick }: KpiCardProps) {
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Voir ${label.toLowerCase()}` : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
      className={cn(
        'p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5',
        onClick && 'group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={`metric-icon ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase leading-tight text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {value}
          </p>
        </div>
        {onClick ? <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /> : null}
      </div>
    </Card>
  )
}

// ─── Mini Card (Financial Summary) ───

interface MiniCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

function MiniCard({ label, value, icon, iconBg, iconColor }: MiniCardProps) {
  return (
    <Card className="p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`metric-icon ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Dashboard ───

export default function DashboardView() {
  const { t } = useI18n()
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard')
      const payload = await readJson<DashboardData & { error?: string }>(response)
      if (!response.ok) throw new Error(payload.error || 'Impossible de charger le tableau de bord')
      return payload
    },
    staleTime: 60_000,
    retry: 1,
    refetchInterval: 60_000,
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertOctagon size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">
          Impossible de charger les données du tableau de bord.
        </p>
      </div>
    )
  }

  const revenueData = data.revenueByMonth.map((d) => ({
    ...d,
    monthLabel: formatMonthLabel(d.month),
  }))

  return (
    <div className="space-y-6">
      <div className="page-heading">
          <h1>{t('screen.overview')}</h1>
        <p>Suivi en temps réel des opérations, des alertes et de la performance financière.</p>
      </div>

      {/* ─── Top Row: 5 KPI Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Dossiers actifs"
          value={data.activeCases}
          icon={<FolderOpen size={22} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          onClick={() => setView('cases', { scope: 'active' })}
        />
        <KpiCard
          label="Dossiers bloqués"
          value={data.blockedCases}
          icon={<AlertOctagon size={22} />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          onClick={() => setView('cases', { scope: 'blocked' })}
        />
        <KpiCard
          label="Dossiers urgents"
          value={data.urgentCases}
          icon={<AlertTriangle size={22} />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          onClick={() => setView('cases', { scope: 'urgent' })}
        />
        <KpiCard
          label="Débours en attente"
          value={data.expensesPending}
          icon={<Wallet size={22} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          onClick={() => setView('expenses', { filter: 'pending' })}
        />
        <KpiCard
          label="CA Total"
          value={formatGNF(data.totalRevenue)}
          icon={<TrendingUp size={22} />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          onClick={() => setView('reports')}
        />
      </div>

      {/* ─── Middle Row: Charts ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar Chart - Revenue */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Revenus mensuels</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={revenueData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <Tooltip content={<RevenueTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill={CHART_COLORS[0]}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Cases by Type */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Dossiers par type</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.casesByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.casesByType.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {data.casesByType.map((entry, index) => (
                <div
                  key={entry.type}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span>{getTypeLabel(entry.type)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Row: Tables ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Dossiers récents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Responsable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCases.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Aucun dossier récent
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentCases.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => setView('case-detail', { id: c.id })}
                      >
                        <TableCell className="font-medium">
                          {c.reference}
                        </TableCell>
                        <TableCell>{c.client?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getStatusColor(c.status)}
                          >
                            {getStatusLabel(c.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getTypeLabel(c.type)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getPriorityColor(c.priority)}
                          >
                            {getPriorityLabel(c.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.serviceChef
                            ? `${c.serviceChef.firstName} ${c.serviceChef.lastName}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Incidents récents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dossier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Aucun incident récent
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentIncidents.map((inc) => (
                      <TableRow
                        key={inc.id}
                        className="cursor-pointer"
                        onClick={() =>
                          inc.case
                            ? setView('case-detail', { id: inc.case.id })
                            : undefined
                        }
                      >
                        <TableCell className="max-w-[180px] truncate font-medium">
                          {inc.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getSeverityColor(inc.severity)}
                          >
                            {getSeverityLabel(inc.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getIncidentStatusColor(inc.status)}
                          >
                            {getIncidentStatusLabel(inc.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inc.case?.reference ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Financial Summary ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniCard
          label="Factures échues"
          value={data.invoicesOverdue}
          icon={<FileWarning size={18} />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />
        <MiniCard
          label="Impayés"
          value={formatGNF(data.totalUnpaid)}
          icon={<DollarSign size={18} />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <MiniCard
          label="Incidents ouverts"
          value={data.incidentsOpen}
          icon={<ShieldAlert size={18} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  )
}
