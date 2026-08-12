'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  Crown,
  Star,
} from 'lucide-react'

// ─── Types ───

interface Contact {
  id: string
  firstName: string
  lastName: string
  position: string
  email: string
  phone: string
  isPrimary: boolean
}

interface Client {
  id: string
  name: string
  type: string
  sector: string
  segment: string
  city: string
  phone: string
  email: string
  taxId: string
  isActive: boolean
  contacts: Contact[]
}

interface ClientFormState {
  name: string
  type: string
  sector: string
  segment: string
  taxId: string
  city: string
  country: string
  phone: string
  email: string
  address: string
  notes: string
  contactFirstName: string
  contactLastName: string
  contactPosition: string
  contactPhone: string
  contactEmail: string
}

const EMPTY_CLIENT_FORM: ClientFormState = {
  name: '',
  type: 'entreprise',
  sector: '',
  segment: 'Standard',
  taxId: '',
  city: 'Conakry',
  country: 'Guinée',
  phone: '',
  email: '',
  address: '',
  notes: '',
  contactFirstName: '',
  contactLastName: '',
  contactPosition: '',
  contactPhone: '',
  contactEmail: '',
}

// ─── Helpers ───

function normalizeSegment(segment?: string | null) {
  return segment?.trim().toLowerCase() ?? ''
}

function getSegmentColor(segment: string): string {
  const normalized = normalizeSegment(segment)
  const map: Record<string, string> = {
    premium:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    standard:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    entreprise:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    particulier:
      'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  }
  return map[normalized] ?? 'bg-gray-100 text-gray-700'
}

function getSegmentLabel(segment: string): string {
  const normalized = normalizeSegment(segment)
  const map: Record<string, string> = {
    premium: 'Premium',
    standard: 'Standard',
    entreprise: 'Entreprise',
    particulier: 'Particulier',
  }
  return map[normalized] ?? segment
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
    <Card className="p-4 transition-all duration-200 hover:shadow-md sm:p-5">
      <div className="flex items-center gap-3.5">
        <div
          className={`metric-icon ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {value}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Client Card ───

interface ClientCardProps {
  client: Client
  onClick: () => void
}

function ClientCard({ client, onClick }: ClientCardProps) {
  const primaryContact = client.contacts.find((c) => c.isPrimary)
  const contactEmail = primaryContact?.email || client.email || ''

  return (
    <Card
      className="group cursor-pointer p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg sm:p-6"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
                {client.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {client.sector}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getSegmentColor(client.segment)}`}
                >
                  {getSegmentLabel(client.segment)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-1">
            <span className={client.isActive ? 'size-1.5 rounded-full bg-emerald-500' : 'size-1.5 rounded-full bg-gray-300'} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {client.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <MapPin size={14} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate">{client.city}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Phone size={14} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate">{client.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Mail size={14} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate">{client.email || '—'}</span>
          </div>
        </div>

        {/* Primary Contact */}
        {primaryContact && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {primaryContact.firstName} {primaryContact.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {primaryContact.position}
              </p>
            </div>
          </div>
        )}

        {contactEmail ? (
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1"
              onClick={(event) => {
                event.stopPropagation()
                const subject = encodeURIComponent(`Suivi client ${client.name}`)
                const body = encodeURIComponent(
                  `Bonjour ${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : client.name},\n\nJe vous contacte au sujet de votre suivi logistique.\n\nCordialement,`,
                )
                window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`
              }}
            >
              <Mail size={14} className="mr-1.5" />
              Email
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ───

function ClientsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Search + Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───

export default function ClientsList() {
  const setView = useAppStore((s) => s.setView)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ClientFormState>(EMPTY_CLIENT_FORM)
  const [formError, setFormError] = useState('')

  const { data: clients, isLoading, isError } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Impossible de charger les clients')
      return response.json()
    },
  })

  const createClient = useMutation({
    mutationFn: async (payload: ClientFormState) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Impossible de créer le client')
      }
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setDialogOpen(false)
      setForm(EMPTY_CLIENT_FORM)
      setFormError('')
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Impossible de créer le client',
      )
    },
  })

  const updateForm = (field: keyof ClientFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  const handleCreateClient = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setFormError('Le nom du client est obligatoire.')
      return
    }
    createClient.mutate(form)
  }

  if (isLoading) return <ClientsSkeleton />

  if (isError || !clients) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Building2 size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">Impossible de charger la liste des clients.</p>
      </div>
    )
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.sector?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalCount = clients.length
  const premiumCount = clients.filter(
    (c) => normalizeSegment(c.segment) === 'premium'
  ).length
  const standardCount = clients.filter(
    (c) => normalizeSegment(c.segment) === 'standard'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-heading">
          <h1>Clients</h1>
          <p>Gérez les comptes, les contacts et la segmentation de votre portefeuille.</p>
        </div>
        <span className="w-fit rounded-md border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {totalCount} comptes enregistrés
        </span>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total clients"
          value={totalCount}
          icon={<Users size={20} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Premium"
          value={premiumCount}
          icon={<Crown size={20} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Standard"
          value={standardCount}
          icon={<Star size={20} />}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* ─── Search & Actions ─── */}
      <div className="flex flex-col gap-3 border-y border-border/70 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Nouveau client
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Ajoutez un compte client et son contact principal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nom client *">
                <Input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Ex: Guinée Import SARL"
                  required
                />
              </FormField>
              <FormField label="NIF / Code client">
                <Input
                  value={form.taxId}
                  onChange={(event) => updateForm('taxId', event.target.value)}
                  placeholder="NIF-..."
                />
              </FormField>
              <FormField label="Type">
                <Select
                  value={form.type}
                  onValueChange={(value) => updateForm('type', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="gouvernement">Gouvernement</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Segment">
                <Select
                  value={form.segment}
                  onValueChange={(value) => updateForm('segment', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Occasionnel">Occasionnel</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Secteur">
                <Input
                  value={form.sector}
                  onChange={(event) => updateForm('sector', event.target.value)}
                  placeholder="Importateur, BTP, Energie..."
                />
              </FormField>
              <FormField label="Ville">
                <Input
                  value={form.city}
                  onChange={(event) => updateForm('city', event.target.value)}
                />
              </FormField>
              <FormField label="Téléphone">
                <Input
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  placeholder="+224 ..."
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  placeholder="contact@client.com"
                />
              </FormField>
            </div>

            <FormField label="Adresse">
              <Input
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
                placeholder="Adresse complète"
              />
            </FormField>

            <div className="rounded-lg border border-border bg-background/45 p-4">
              <p className="mb-4 text-sm font-semibold text-foreground">
                Contact principal
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Prénom">
                  <Input
                    value={form.contactFirstName}
                    onChange={(event) =>
                      updateForm('contactFirstName', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Nom">
                  <Input
                    value={form.contactLastName}
                    onChange={(event) =>
                      updateForm('contactLastName', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Fonction">
                  <Input
                    value={form.contactPosition}
                    onChange={(event) =>
                      updateForm('contactPosition', event.target.value)
                    }
                    placeholder="Directeur logistique"
                  />
                </FormField>
                <FormField label="Téléphone contact">
                  <Input
                    value={form.contactPhone}
                    onChange={(event) =>
                      updateForm('contactPhone', event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Email contact">
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      updateForm('contactEmail', event.target.value)
                    }
                    className="sm:col-span-2"
                  />
                </FormField>
              </div>
            </div>

            <FormField label="Notes internes">
              <Textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="Conditions commerciales, préférences, remarques..."
              />
            </FormField>

            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? 'Création...' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Client Cards Grid ─── */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2
            size={40}
            strokeWidth={1.5}
            className="mx-auto text-muted-foreground/40"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {search
              ? 'Aucun client trouvé pour cette recherche.'
              : 'Aucun client enregistré.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setView('client-detail', { id: client.id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
