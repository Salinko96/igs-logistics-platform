'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  formatDate,
  formatDateTime,
  SEVERITY_LEVELS,
  INCIDENT_TYPES,
  getIncidentStatus,
} from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  AlertOctagon,
  Plus,
  FolderOpen,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Clock,
} from 'lucide-react'

// ─── Types ───

interface Incident {
  id: string
  title: string
  description: string
  type: string
  severity: string
  status: string
  createdAt: string
  updatedAt: string
  resolution: string | null
  case: { id: string; reference: string; client: { name: string } }
}

// ─── Helpers ───

function getSeverityColor(severity: string): string {
  const found = SEVERITY_LEVELS.find((s) => s.value === severity)
  return found ? found.color : 'bg-gray-100 text-gray-700'
}

function getSeverityLabel(severity: string): string {
  const found = SEVERITY_LEVELS.find((s) => s.value === severity)
  return found ? found.label : severity
}

function getIncidentTypeLabel(type: string): string {
  const found = INCIDENT_TYPES.find((t) => t.value === type)
  return found ? found.label : type
}

function getIncidentStatusLabel(status: string): string {
  return getIncidentStatus(status)?.label ?? status
}

function getIncidentStatusColor(status: string): string {
  return getIncidentStatus(status)?.color ?? 'bg-gray-100 text-gray-700'
}

function getResolutionProgress(incident: Incident): number {
  if (incident.status === 'resolu' || incident.status === 'cloture' || incident.status === 'clôturé') return 100
  if (incident.status === 'ouvert') return 10
  if (incident.status === 'en_cours') return 50
  return 0
}

function getProgressColor(progress: number): string {
  if (progress === 100) return '[&>div]:bg-green-500'
  if (progress >= 50) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

// ─── Stat Card ───

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

function StatCard({ label, value, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card className="p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Incident Card ───

interface IncidentCardProps {
  incident: Incident
}

function IncidentCard({ incident }: IncidentCardProps) {
  const setView = useAppStore((s) => s.setView)
  const progress = getResolutionProgress(incident)

  return (
    <Card
      className="group cursor-pointer p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/20"
      onClick={() =>
        incident.case
          ? setView('case-detail', { id: incident.case.id })
          : undefined
      }
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {incident.title}
          </h3>
          <Badge
            variant="secondary"
            className={`shrink-0 ${getSeverityColor(incident.severity)}`}
          >
            {getSeverityLabel(incident.severity)}
          </Badge>
        </div>

        {/* Badges Row */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {getIncidentTypeLabel(incident.type)}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs ${getIncidentStatusColor(incident.status)}`}
          >
            {getIncidentStatusLabel(incident.status)}
          </Badge>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {incident.description}
        </p>

        {/* Case Reference */}
        {incident.case && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <FolderOpen size={13} className="shrink-0" />
            <span className="font-mono">{incident.case.reference}</span>
            {incident.case.client && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {incident.case.client && (
              <span className="truncate">
                {incident.case.client.name}
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Résolution</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className={`h-2 ${getProgressColor(progress)}`} />
        </div>

        {/* Dates */}
        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="shrink-0" />
            <span>{formatDate(incident.createdAt)}</span>
          </div>
          {incident.updatedAt !== incident.createdAt && (
            <span>MAJ {formatDate(incident.updatedAt)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ───

function IncidentsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───

export default function IncidentsList() {
  const queryClient = useQueryClient()
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'retard',
    severity: 'moyen',
    caseId: '',
  })

  const { data: incidents, isLoading, isError } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await fetch('/api/incidents')
      if (!response.ok) throw new Error('Impossible de charger les incidents')
      return response.json()
    },
  })

  const { data: cases = [] } = useQuery<Array<{ id: string; reference: string }>>({
    queryKey: ['incident-cases'],
    queryFn: async () => {
      const response = await fetch('/api/cases?compact=true&pageSize=100')
      if (!response.ok) throw new Error('Impossible de charger les dossiers')
      const payload = await response.json()
      return payload.items
    },
  })

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === form.caseId),
    [cases, form.caseId],
  )

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateBusy(true)
    setCreateError(null)
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          caseId: form.caseId || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Création impossible')
      setCreateOpen(false)
      setForm({
        title: '',
        description: '',
        type: 'retard',
        severity: 'moyen',
        caseId: '',
      })
      await queryClient.invalidateQueries({ queryKey: ['incidents'] })
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setCreateBusy(false)
    }
  }

  if (isLoading) return <IncidentsSkeleton />

  if (isError || !incidents) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertOctagon size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">
          Impossible de charger les données des incidents.
        </p>
      </div>
    )
  }

  const openCount = incidents.filter((i) => i.status === 'ouvert').length
  const inProgressCount = incidents.filter((i) => i.status === 'en_cours').length
  const resolvedCount = incidents.filter(
    (i) => i.status === 'resolu' || i.status === 'cloture' || i.status === 'clôturé'
  ).length
  const criticalCount = incidents.filter(
    (i) => i.severity === 'critique'
  ).length

  const filtered = incidents.filter((i) => {
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* ─── Title Row ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Incidents & Réclamations
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi et résolution des incidents
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nouvel incident
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvel incident</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreate}>
            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((s) => ({ ...s, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Sévérité</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((s) => ({ ...s, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dossier optionnel</Label>
              <Select value={form.caseId || 'none'} onValueChange={(v) => setForm((s) => ({ ...s, caseId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Dossier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans dossier</SelectItem>
                  {cases.map((item) => <SelectItem key={item.id} value={item.id}>{item.reference}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedCase ? (
              <p className="text-xs text-muted-foreground">Incident lié au dossier {selectedCase.reference}</p>
            ) : null}
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createBusy}>{createBusy ? 'Création...' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ouverts"
          value={openCount}
          icon={<AlertTriangle size={20} />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />
        <StatCard
          label="En cours"
          value={inProgressCount}
          icon={<Loader2 size={20} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Résolus"
          value={resolvedCount}
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Critiques"
          value={criticalCount}
          icon={<ShieldAlert size={20} />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <ShieldAlert size={16} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sévérités</SelectItem>
              {SEVERITY_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <AlertTriangle size={16} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ouvert">Ouvert</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="resolu">Résolu</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} incident{filtered.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* ─── Cards Grid ─── */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertTriangle
            size={40}
            strokeWidth={1.5}
            className="mx-auto text-muted-foreground/40"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun incident trouvé pour ces filtres.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  )
}
