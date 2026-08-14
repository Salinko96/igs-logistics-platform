'use client'

import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatGNF, formatDate, EXPENSE_STATUSES } from '@/lib/constants'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useI18n } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet,
  Clock,
  CheckCircle2,
  Banknote,
  XCircle,
  AlertOctagon,
  Plus,
} from 'lucide-react'
import { PageHero } from '@/components/shared/page-hero'
import { useAppStore } from '@/lib/store'

// ─── Types ───

interface Expense {
  id: string
  amount: number
  currency: string
  description: string
  vendor: string
  vendorType: string
  category: string
  status: string
  rejectionReason: string | null
  createdAt: string
  requester: { firstName: string; lastName: string }
  case: { reference: string }
}

// ─── Helpers ───

function getExpenseStatusLabel(status: string): string {
  const found = EXPENSE_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

function getExpenseStatusColor(status: string): string {
  const map: Record<string, string> = {
    cree: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    soumis: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    en_validation:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approuve:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    paye: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    justifie:
      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    rapproche:
      'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

// ─── Stat Card ───

interface StatCardProps {
  label: string
  value: string | number
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

// ─── Loading Skeleton ───

function ExpensesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Table */}
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Main Component ───

export default function ExpensesList({ initialFilter = 'all' }: { initialFilter?: string }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const role = useAppStore((state) => state.currentProfile?.role)
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter === 'pending' ? 'pending' : 'all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    vendor: '',
    category: '',
  })

  const { data: expenses, isLoading, isError } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await fetch('/api/expenses')
      if (!response.ok) throw new Error('Impossible de charger les débours')
      return response.json()
    },
  })

  const { data: cases = [] } = useQuery<Array<{ id: string; reference: string }>>({
    queryKey: ['expense-cases'],
    queryFn: async () => {
      const response = await fetch('/api/cases?compact=true&pageSize=100')
      if (!response.ok) throw new Error('Impossible de charger les dossiers')
      const payload = await response.json()
      return payload.items
    },
  })

  const [caseId, setCaseId] = useState<string>('')
  const selectedCaseId = caseId || cases[0]?.id || ''
  const decide = async (id: string, status: 'approuve' | 'rejete') => {
    const rejectionReason = status === 'rejete' ? window.prompt('Motif du rejet :')?.trim() : ''
    if (status === 'rejete' && !rejectionReason) return
    const response = await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, rejectionReason }) })
    if (response.ok) await queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateBusy(true)
    setCreateError(null)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          caseId: caseId || null,
          amount: Number(form.amount),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Création impossible')
      setCreateOpen(false)
      setForm({ description: '', amount: '', vendor: '', category: '' })
      setCaseId('')
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setCreateBusy(false)
    }
  }

  if (isLoading) return <ExpensesSkeleton />

  if (isError || !expenses) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertOctagon size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">
          Impossible de charger les données des débours.
        </p>
      </div>
    )
  }

  const pendingCount = expenses.filter(
    (e) => e.status === 'soumis' || e.status === 'en_validation' || e.status === 'cree'
  ).length
  const approvedCount = expenses.filter(
    (e) => e.status === 'approuve'
  ).length
  const paidThisMonth = expenses.filter(
    (e) =>
      e.status === 'paye' &&
      new Date(e.createdAt).getMonth() === new Date().getMonth() &&
      new Date(e.createdAt).getFullYear() === new Date().getFullYear()
  ).length
  const rejectedCount = expenses.filter(
    (e) => e.status === 'rejete'
  ).length

  const filtered =
    statusFilter === 'all'
      ? expenses
      : statusFilter === 'pending'
        ? expenses.filter((e) => e.status === 'soumis' || e.status === 'en_validation' || e.status === 'approuve')
      : expenses.filter((e) => e.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* ─── Title Row ─── */}
      <PageHero eyebrow="Contrôle des dépenses" title={t('screen.expenses')} description="Gérez les débours de transit, validations et justificatifs financiers." actions={['ADMIN', 'AGENT', 'EXPLOITANT', 'COMPTABLE'].includes(role || '') ? <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          {t('action.newExpense')}
        </Button> : undefined} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouveau débours</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreate}>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Montant</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Dossier optionnel</Label>
                <Select value={selectedCaseId || 'none'} onValueChange={(v) => setCaseId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Dossier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sans dossier</SelectItem>
                    {cases.map((item) => <SelectItem key={item.id} value={item.id}>{item.reference}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Fournisseur</Label>
                <Input value={form.vendor} onChange={(e) => setForm((s) => ({ ...s, vendor: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Catégorie</Label>
                <Input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
              </div>
            </div>
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
          label="En attente"
          value={pendingCount}
          icon={<Clock size={20} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Approuvés"
          value={approvedCount}
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Payés ce mois"
          value={paidThisMonth}
          icon={<Banknote size={20} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Rejetés"
          value={rejectedCount}
          icon={<XCircle size={20} />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <Wallet size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente (tous)</SelectItem>
            {EXPENSE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filtered.length} dépense{filtered.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* ─── Table ─── */}
      <Card className="p-6">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Dossier</TableHead>
                <TableHead className="hidden lg:table-cell">Fournisseur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden sm:table-cell">Demandeur</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                {['ADMIN', 'COMPTABLE'].includes(role || '') && <TableHead>Décision</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun débours trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="max-w-[220px]">
                        <p className="truncate font-medium text-foreground">
                          {expense.description}
                        </p>
                        {expense.rejectionReason && (
                          <p className="mt-0.5 truncate text-xs text-red-500">
                            Motif : {expense.rejectionReason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {expense.case?.reference ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {expense.vendor}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground whitespace-nowrap">
                      <CurrencyDisplay amount={expense.amount} currency={expense.currency} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`whitespace-nowrap ${getExpenseStatusColor(expense.status)}`}
                      >
                        {getExpenseStatusLabel(expense.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                      {expense.requester
                        ? `${expense.requester.firstName} ${expense.requester.lastName}`
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                      {formatDate(expense.createdAt)}
                    </TableCell>
                    {['ADMIN', 'COMPTABLE'].includes(role || '') && <TableCell>{['soumis', 'en_validation'].includes(expense.status) ? <div className="flex gap-2"><Button size="sm" onClick={() => void decide(expense.id, 'approuve')}>Valider</Button><Button size="sm" variant="outline" onClick={() => void decide(expense.id, 'rejete')}>Rejeter</Button></div> : '—'}</TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
