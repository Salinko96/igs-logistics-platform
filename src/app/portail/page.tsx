'use client'

import { FormEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderOpen,
  LockKeyhole,
  Receipt,
  Search,
  Ship,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatGNF } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface PortalDocument {
  id: string
  name: string
  category: string
  status: string
  fileUrl: string | null
  createdAt: string
}

interface PortalCase {
  id: string
  reference: string
  type: string
  direction: string
  status: string
  priority: string
  merchandise: string | null
  eta: string | null
  updatedAt: string
  documents: PortalDocument[]
}

interface PortalInvoice {
  id: string
  invoiceNumber: string
  status: string
  issuedAt: string | null
  dueDate: string | null
  totalAmount: number
  paidAmount: number
  currency: string
  case: { reference: string } | null
}

interface PortalClient {
  id: string
  name: string
  sector: string | null
  segment: string | null
  city: string
  phone: string | null
  email: string | null
  cases: PortalCase[]
  invoices: PortalInvoice[]
}

function formatDate(value: string | null) {
  if (!value) return 'Non planifiee'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function statusTone(status: string) {
  if (['livre', 'payee', 'conforme', 'documents_conformes'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
  }
  if (['echue', 'rejete', 'non_conforme', 'suspendu'].includes(status)) {
    return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
  }
  if (['en_attente_paiement', 'documents_en_attente', 'partiellement_payee'].includes(status)) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
  }
  return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
}

function PortalSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-20 w-full" />
        </Card>
      ))}
    </div>
  )
}

export default function ClientPortalPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [client, setClient] = useState<PortalClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [documentError, setDocumentError] = useState('')

  const documents = useMemo(
    () => client?.cases.flatMap((item) => item.documents) ?? [],
    [client],
  )
  const unpaidInvoices = useMemo(
    () =>
      client?.invoices.filter(
        (invoice) => invoice.status !== 'payee' && invoice.totalAmount > invoice.paidAmount,
      ) ?? [],
    [client],
  )

  function handleOpenDocument(fileUrl: string | null, fallbackName: string) {
    if (!fileUrl) {
      setDocumentError(`Le document ${fallbackName} n'a pas de fichier disponible.`)
      return
    }
    setDocumentError('')
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const anchor = document.createElement('a')
    anchor.href = fileUrl
    anchor.download = fallbackName
    anchor.target = '_blank'
    anchor.rel = 'noreferrer'
    anchor.click()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setDocumentError('')
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ email, code })
      const response = await fetch(`/api/portal/client?${params.toString()}`)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Acces refuse')
      }

      if (
        !payload ||
        !payload.client ||
        !Array.isArray(payload.client.cases) ||
        !Array.isArray(payload.client.invoices)
      ) {
        throw new Error('Acces refuse')
      }

      setClient(payload.client)
    } catch (err) {
      setClient(null)
      setError(err instanceof Error ? err.message : 'Acces refuse')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-white p-1.5">
              <Image src="/igs-icon.png" alt="IGS" width={34} height={34} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Ibrahima Gold Service
              </p>
              <p className="text-xs text-muted-foreground">
                Portail client securise
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <LockKeyhole size={13} />
            Lecture seule
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        {!client && (
          <section className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="space-y-4">
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Suivi de vos dossiers de transit en temps reel
              </h1>
              <p className="max-w-xl text-muted-foreground">
                Consultez uniquement vos dossiers, les documents partages et les
                factures rattachees a votre compte client IGS.
              </p>
              <div className="grid max-w-xl gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <FolderOpen className="mb-3 size-5 text-primary" />
                  <p className="text-sm font-medium">Dossiers</p>
                  <p className="text-xs text-muted-foreground">Statut et ETA</p>
                </Card>
                <Card className="p-4">
                  <FileText className="mb-3 size-5 text-primary" />
                  <p className="text-sm font-medium">Documents</p>
                  <p className="text-xs text-muted-foreground">Fichiers partages</p>
                </Card>
                <Card className="p-4">
                  <Receipt className="mb-3 size-5 text-primary" />
                  <p className="text-sm font-medium">Factures</p>
                  <p className="text-xs text-muted-foreground">Montants dus</p>
                </Card>
              </div>
            </div>

            <Card className="p-6">
              <CardHeader className="p-0 pb-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search size={18} />
                  Acces client
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="portal-email">Email client</Label>
                    <Input
                      id="portal-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="contact@client.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portal-code">Code client / NIF</Label>
                    <Input
                      id="portal-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="NIF-GES-2024-008"
                      required
                    />
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Verification...' : 'Ouvrir le portail'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {isLoading && <PortalSkeleton />}

        {client && !isLoading && (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compte client</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {client.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {[client.sector, client.segment, client.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClient(null)
                  setCode('')
                  setDocumentError('')
                }}
              >
                Changer de client
              </Button>
            </div>
            {documentError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <p>{documentError}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-inherit hover:bg-red-100/60 hover:text-inherit dark:hover:bg-red-900/30"
                  onClick={() => setDocumentError('')}
                >
                  Fermer
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <FolderOpen className="mb-3 size-5 text-primary" />
                <p className="text-2xl font-bold">{client.cases.length}</p>
                <p className="text-sm text-muted-foreground">Dossiers visibles</p>
              </Card>
              <Card className="p-5">
                <FileText className="mb-3 size-5 text-primary" />
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents partages</p>
              </Card>
              <Card className="p-5">
                <Receipt className="mb-3 size-5 text-primary" />
                <p className="text-2xl font-bold">{unpaidInvoices.length}</p>
                <p className="text-sm text-muted-foreground">Factures a payer</p>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <Card className="p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base">Vos dossiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0">
                  {client.cases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun dossier actif pour ce compte.
                    </p>
                  ) : (
                    client.cases.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-semibold text-foreground">
                              {item.reference}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.merchandise ?? 'Marchandise non renseignee'}
                            </p>
                          </div>
                          <Badge className={cn('capitalize', statusTone(item.status))}>
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <span className="inline-flex items-center gap-1.5">
                            <Ship size={14} />
                            {item.type} / {item.direction}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} />
                            ETA {formatDate(item.eta)}
                          </span>
                          <span>
                            Mis a jour {formatDate(item.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="p-5">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base">Factures</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-0">
                    {client.invoices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucune facture visible.
                      </p>
                    ) : (
                      client.invoices.map((invoice) => (
                        <div key={invoice.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-sm font-semibold">
                                {invoice.invoiceNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.case?.reference ?? 'Sans dossier'}
                              </p>
                            </div>
                            <Badge className={cn('capitalize', statusTone(invoice.status))}>
                              {statusLabel(invoice.status)}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-semibold">
                            {formatGNF(invoice.totalAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Echeance {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="p-5">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base">Documents partages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-0">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun document partage pour le moment.
                      </p>
                    ) : (
                      documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {document.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {document.category} · {formatDate(document.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {document.fileUrl ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => handleOpenDocument(document.fileUrl, document.name)}
                              >
                                <Download size={14} className="mr-1" />
                                Ouvrir
                              </Button>
                            ) : null}
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
