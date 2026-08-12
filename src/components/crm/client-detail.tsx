'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, CalendarDays, Mail, MapPin, Phone, User, FolderOpen } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/constants'

type ClientDetail = {
  id: string
  name: string
  type: string
  sector: string | null
  segment: string | null
  city: string
  country: string
  address: string | null
  phone: string | null
  email: string | null
  notes: string | null
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    position: string | null
    email: string | null
    phone: string | null
    isPrimary: boolean
  }>
  cases: Array<{
    id: string
    reference: string
    type: string
    status: string
    updatedAt: string
    eta: string | null
    serviceChef: { firstName: string; lastName: string } | null
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    status: string
    issuedAt: string | null
    dueDate: string | null
    totalAmount: number
    paidAmount: number
  }>
}

function ClientDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-40" />
      <Card className="p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-4 h-24 w-full" />
      </Card>
    </div>
  )
}

export default function ClientDetail() {
  const id = useAppStore((s) => s.viewParams.id)
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading, isError } = useQuery<ClientDetail>({
    queryKey: ['client-detail', id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${id}`)
      if (!response.ok) throw new Error('Impossible de charger le client')
      return response.json()
    },
    enabled: !!id,
  })

  if (isLoading || !data) return <ClientDetailSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Building2 className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Impossible de charger le client</h1>
        <Button type="button" variant="outline" onClick={() => setView('clients')}>
          <ArrowLeft className="mr-2 size-4" />
          Retour aux clients
        </Button>
      </div>
    )
  }

  const primaryContact = data.contacts.find((contact) => contact.isPrimary)
  const primaryContactEmail = primaryContact?.email || data.email || ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button type="button" variant="ghost" onClick={() => setView('clients')} className="-ml-2 mb-2">
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.sector || 'Secteur non renseigné'} · {data.city}
          </p>
        </div>
        <Badge variant="secondary">{data.segment || 'Standard'}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={<MapPin className="size-4" />} label="Adresse" value={data.address || '—'} />
            <InfoRow icon={<Phone className="size-4" />} label="Téléphone" value={data.phone || '—'} />
            <InfoRow icon={<Mail className="size-4" />} label="Email" value={data.email || '—'} />
            <InfoRow icon={<CalendarDays className="size-4" />} label="Pays" value={data.country} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {primaryContact ? (
              <>
                <p className="font-medium">{primaryContact.firstName} {primaryContact.lastName}</p>
                <p className="text-sm text-muted-foreground">{primaryContact.position || '—'}</p>
                <p className="text-sm text-muted-foreground">{primaryContact.phone || '—'}</p>
                <p className="text-sm text-muted-foreground">{primaryContact.email || '—'}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun contact principal.</p>
            )}
            {primaryContactEmail ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  const subject = encodeURIComponent(`Suivi client ${data.name}`)
                  const body = encodeURIComponent(
                    `Bonjour ${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : data.name},\n\nNous souhaitons faire un point sur votre dossier.\n\nCordialement,`,
                  )
                  window.location.href = `mailto:${primaryContactEmail}?subject=${subject}&body=${body}`
                }}
              >
                <Mail className="mr-2 size-4" />
                Contacter par email
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {data.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
          ) : (
            data.contacts.map((contact) => (
              <div key={contact.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </p>
                  {contact.isPrimary && <Badge>Principal</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{contact.position || '—'}</p>
                <p className="text-sm text-muted-foreground">{contact.phone || '—'}</p>
                <p className="text-sm text-muted-foreground">{contact.email || '—'}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            Dossiers liés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dossier lié.</p>
          ) : (
            data.cases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView('case-detail', { id: item.id })}
                className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{item.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.type} · {item.serviceChef ? `${item.serviceChef.firstName} ${item.serviceChef.lastName}` : '—'}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{formatDate(item.updatedAt)}</p>
                  <p>{item.eta ? `ETA ${formatDate(item.eta)}` : '—'}</p>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
