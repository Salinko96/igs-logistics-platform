'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Anchor,
  Check,
  Clipboard,
  ExternalLink,
  Radar,
  Search,
  Ship,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getStatusLabel } from '@/lib/constants'
import { PageHero } from '@/components/shared/page-hero'

interface Container {
  id: string
  containerNumber: string | null
  size: string | null
  type: string | null
  status: string
}

interface Shipment {
  id: string
  vesselName: string | null
  voyageNumber: string | null
  blNumber: string | null
  shippingLine: string | null
  bookingNumber: string | null
  loadingPort: string | null
  dischargePort: string | null
  updatedAt: string
  containers: Container[]
  case: {
    id: string
    reference: string
    status: string
    priority: string
    eta: string | null
    client: { name: string }
  }
}

const CARRIERS = [
  {
    name: 'CMA CGM',
    aliases: ['CMA CGM', 'CMA-CGM'],
    url: 'https://www.cma-cgm.com/ebusiness/tracking',
    description: 'Tracking BL, booking et conteneur',
  },
  {
    name: 'Hapag-Lloyd',
    aliases: ['HAPAG', 'HAPAG-LLOYD', 'Hapag-Lloyd'],
    url: 'https://www.hapag-lloyd.com/en/online-business/track/track.html',
    description: 'Container, Booking ou B/L Number',
  },
  {
    name: 'MSC',
    aliases: ['MSC', 'Mediterranean Shipping Company'],
    url: 'https://www.msc.com/en/track-a-shipment',
    description: 'Container / BL / booking',
  },
  {
    name: 'Maersk',
    aliases: ['MAERSK', 'Maersk'],
    url: 'https://www.maersk.com/tracking/',
    description: 'B/L, container ou booking',
  },
  {
    name: 'COSCO Shipping',
    aliases: ['COSCO', 'CSCL'],
    url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking',
    description: 'Cargo tracking COSCO',
  },
  {
    name: 'Ocean Network Express',
    aliases: ['ONE', 'Ocean Network Express'],
    url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking',
    description: 'Cargo tracking ONE',
  },
  {
    name: 'Evergreen',
    aliases: ['EVERGREEN', 'EGLV'],
    url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do',
    description: 'ShipmentLink cargo tracking',
  },
  {
    name: 'Yang Ming',
    aliases: ['YANG MING', 'YML'],
    url: 'https://www.yangming.com/e-service/track_trace/track_trace_cargo_tracking.aspx',
    description: 'Cargo tracking Yang Ming',
  },
]

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

function getCarrierFor(line?: string | null) {
  const normalized = normalize(line)
  return (
    CARRIERS.find((carrier) =>
      carrier.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    ) ?? CARRIERS[0]
  )
}

function getCarrierTrackingUrl(carrier: (typeof CARRIERS)[number], reference?: string | null) {
  if (carrier.name === 'CMA CGM' && reference) {
    const url = new URL(carrier.url)
    url.searchParams.set('Reference', reference)
    url.searchParams.set('SearchBy', 'BL')
    return url.toString()
  }
  return carrier.url
}

function formatDate(value: string | null) {
  if (!value) return 'Non renseignée'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function trackingCoordinates(value: unknown): { latitude: number; longitude: number } | null {
  const found: Array<{ latitude: number; longitude: number }> = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    const record = node as Record<string, unknown>
    const latitude = Number(record.latitude ?? record.Latitude ?? record.lat ?? record.Lat)
    const longitude = Number(record.longitude ?? record.Longitude ?? record.lng ?? record.lon ?? record.Lon)
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) found.push({ latitude, longitude })
    Object.values(record).forEach(visit)
  }
  visit(value)
  return found.at(-1) ?? null
}

function TrackingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-5 h-24 w-full" />
        </Card>
      ))}
    </div>
  )
}

export default function ShippingTrackersView() {
  const setView = useAppStore((s) => s.setView)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState('')
  const [refreshing, setRefreshing] = useState('')
  const [refreshMessage, setRefreshMessage] = useState('')
  const [trackingResult, setTrackingResult] = useState<unknown>(null)
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [manualBl, setManualBl] = useState('')
  const [manualCarrier, setManualCarrier] = useState('')
  const coordinates = useMemo(() => trackingCoordinates(trackingResult), [trackingResult])

  const { data: shipments = [], isLoading, isError } = useQuery<Shipment[]>({
    queryKey: ['shipping-trackers'],
    queryFn: async () => {
      const response = await fetch('/api/shipping-trackers')
      if (!response.ok) throw new Error('Erreur de chargement')
      return response.json()
    },
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return shipments
    return shipments.filter((shipment) =>
      [
        shipment.case.reference,
        shipment.case.client.name,
        shipment.vesselName,
        shipment.voyageNumber,
        shipment.blNumber,
        shipment.bookingNumber,
        shipment.shippingLine,
        shipment.loadingPort,
        shipment.dischargePort,
        ...shipment.containers.map((container) => container.containerNumber),
      ]
        .filter(Boolean)
        .some((value) => normalize(value).includes(q)),
    )
  }, [query, shipments])

  const stats = useMemo(() => {
    const containers = shipments.reduce(
      (total, shipment) => total + shipment.containers.length,
      0,
    )
    const carriers = new Set(shipments.map((shipment) => shipment.shippingLine).filter(Boolean))
    return { shipments: shipments.length, containers, carriers: carriers.size }
  }, [shipments])

  async function copyReference(value: string) {
    setCopyError('')
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const copiedText = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!copiedText) {
          throw new Error('copy_failed')
        }
      }
      setCopied(value)
      window.setTimeout(() => setCopied(''), 1400)
    } catch {
      setCopyError('Impossible de copier cette référence')
    }
  }

  async function refreshExternal(
    reference: string,
    type: 'container' | 'bl' | 'vessel',
    shippingLine?: string | null,
  ) {
    setRefreshing(`${type}:${reference}`)
    setRefreshMessage('')
    setTrackingResult(null)
    setFallbackUrl('')
    try {
      const response = await fetch('/api/shipping-trackers/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, type, shippingLine }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Actualisation impossible')
      setTrackingResult(payload.result ?? null)
      setRefreshMessage(`${type === 'vessel' ? 'AISStream' : 'ShipsGo'} : données reçues pour ${reference}`)
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : 'Actualisation impossible')
      if (type === 'bl') {
        const carrier = getCarrierFor(shippingLine)
        setFallbackUrl(getCarrierTrackingUrl(carrier, reference))
      }
    } finally {
      setRefreshing('')
    }
  }

  function trackManualBl() {
    const reference = manualBl.trim()
    if (!reference) {
      setRefreshMessage('Saisis un numéro de Master BL.')
      return
    }
    void refreshExternal(reference, 'bl', manualCarrier || null)
  }

  if (isLoading) return <TrackingSkeleton />

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Radar size={48} strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-sm">Impossible de charger les trackers maritimes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Visibilité maritime" title="Tracking navires" description="Suivi centralisé des BL, bookings, navires et conteneurs via les sources officielles." actions={<div className="relative w-full sm:w-[340px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher BL, conteneur, navire..."
            className="border-white/20 bg-white text-slate-900 pl-9"
          />
        </div>} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Ship className="mb-3 size-5 text-primary" />
          <p className="text-2xl font-bold">{stats.shipments}</p>
          <p className="text-sm text-muted-foreground">Expeditions maritimes</p>
        </Card>
        <Card className="p-5">
          <Anchor className="mb-3 size-5 text-primary" />
          <p className="text-2xl font-bold">{stats.containers}</p>
          <p className="text-sm text-muted-foreground">Conteneurs suivis</p>
        </Card>
        <Card className="p-5">
          <Radar className="mb-3 size-5 text-primary" />
          <p className="text-2xl font-bold">{stats.carriers}</p>
          <p className="text-sm text-muted-foreground">Lignes detectees</p>
        </Card>
      </div>
      <Card className="border-primary/25 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Traquer un BL directement</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Utilise le Master Bill of Lading fourni par la compagnie maritime.
            </p>
            <Input
              value={manualBl}
              onChange={(event) => setManualBl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') trackManualBl()
              }}
              placeholder="Ex. CMDU..."
              className="mt-3 bg-background"
              aria-label="Numéro de Master BL"
            />
          </div>
          <div className="w-full lg:w-64">
            <p className="text-xs font-semibold text-muted-foreground">Ligne maritime (optionnel)</p>
            <Input
              value={manualCarrier}
              onChange={(event) => setManualCarrier(event.target.value)}
              placeholder="Ex. CMA CGM"
              className="mt-2 bg-background"
              aria-label="Ligne maritime"
            />
          </div>
          <Button type="button" onClick={trackManualBl} disabled={Boolean(refreshing)}>
            <Search className="mr-2 size-4" />
            Traquer le BL
          </Button>
        </div>
      </Card>
      {copyError ? (
        <p className="text-sm text-destructive">{copyError}</p>
      ) : null}
      {refreshMessage ? (
        <p className="text-sm text-muted-foreground">{refreshMessage}</p>
      ) : null}
      {fallbackUrl ? (
        <Button asChild type="button" size="sm" variant="outline">
          <a href={fallbackUrl} target="_blank" rel="noreferrer">
            Ouvrir la recherche CMA avec ce BL
            <ExternalLink className="ml-2 size-3.5" />
          </a>
        </Button>
      ) : null}
      {trackingResult ? (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Résultat du tracking</p><p className="text-xs text-muted-foreground">Données externes ShipsGo ou AISStream, à confirmer avant décision sensible.</p></div>{coordinates ? <Button asChild size="sm" variant="outline"><a href={`https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=8/${coordinates.latitude}/${coordinates.longitude}`} target="_blank" rel="noreferrer">Voir la position sur la carte<ExternalLink className="ml-2 size-3.5" /></a></Button> : null}</div>
          {coordinates ? <div className="relative mt-4 h-44 overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_55%_45%,#bde5dd_0_2%,transparent_2.5%),linear-gradient(135deg,#dff3ed,#b7d9d3)]"><div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" /><div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"><span className="size-5 rounded-full border-4 border-white bg-primary shadow-lg" /><span className="mt-2 rounded-md bg-slate-950/80 px-2 py-1 font-mono text-[10px] text-white">{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span></div></div> : <p className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Aucune coordonnée exploitable n’a été renvoyée pour cette référence. La carte n’est jamais simulée.</p>}
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {JSON.stringify(trackingResult, null, 2)}
          </pre>
        </Card>
      ) : null}

      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">Transporteurs officiels</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {CARRIERS.map((carrier) => (
            <a
              key={carrier.name}
              href={carrier.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-card/70 p-4 transition-colors hover:border-primary/35 hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{carrier.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {carrier.description}
                  </p>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center xl:col-span-2">
            <Radar
              size={42}
              strokeWidth={1.5}
              className="mx-auto text-muted-foreground/40"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun tracking maritime trouve pour cette recherche.
            </p>
          </Card>
        ) : (
          filtered.map((shipment) => {
            const carrier = getCarrierFor(shipment.shippingLine)
            const references = [
              { label: 'BL', value: shipment.blNumber },
              { label: 'Booking', value: shipment.bookingNumber },
              ...shipment.containers.map((container) => ({
                label: container.size ?? 'Conteneur',
                value: container.containerNumber,
              })),
            ].filter((item): item is { label: string; value: string } => Boolean(item.value))

            return (
              <Card key={shipment.id} className="p-5">
                <CardContent className="space-y-4 p-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {shipment.case.reference}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {shipment.case.client.name}
                      </p>
                    </div>
                    <Badge variant="outline">{shipment.shippingLine ?? carrier.name}</Badge>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <InfoLine label="Navire" value={shipment.vesselName ?? 'Non renseigne'} />
                    <InfoLine label="Voyage" value={shipment.voyageNumber ?? 'Non renseigne'} />
                    <InfoLine label="Port depart" value={shipment.loadingPort ?? 'Non renseigne'} />
                    <InfoLine label="Port arrivee" value={shipment.dischargePort ?? 'Non renseigne'} />
                    <InfoLine label="ETA dossier" value={formatDate(shipment.case.eta)} />
                    <InfoLine label="Statut dossier" value={getStatusLabel(shipment.case.status)} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      References a tracker
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {references.length === 0 ? (
                        <Badge variant="secondary">Aucune reference</Badge>
                      ) : (
                        references.map((reference) => (
                          <button
                            key={`${reference.label}-${reference.value}`}
                            type="button"
                            onClick={() =>
                              reference.label === 'BL'
                                ? refreshExternal(reference.value, 'bl', shipment.shippingLine)
                                : copyReference(reference.value)
                            }
                            disabled={Boolean(refreshing)}
                            title={reference.label === 'BL' ? 'Cliquer pour traquer ce BL avec ShipsGo' : 'Copier la référence'}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/35 hover:bg-accent/60 disabled:cursor-wait disabled:opacity-60',
                              copied === reference.value && 'border-primary/50 bg-accent',
                            )}
                          >
                            {reference.label === 'BL' ? (
                              <RefreshCw className={cn('size-3 text-primary', refreshing === `bl:${reference.value}` && 'animate-spin')} />
                            ) : copied === reference.value ? (
                              <Check className="size-3 text-primary" />
                            ) : (
                              <Clipboard className="size-3 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">{reference.label}</span>
                            <span className="font-mono text-foreground">{reference.value}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
                    {shipment.containers[0]?.containerNumber ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => refreshExternal(shipment.containers[0].containerNumber!, 'container')} disabled={Boolean(refreshing)}>
                        <RefreshCw className={cn('mr-2 size-3.5', refreshing === `container:${shipment.containers[0].containerNumber}` && 'animate-spin')} />
                        Actualiser ShipsGo
                      </Button>
                    ) : null}
                    {shipment.blNumber ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => refreshExternal(shipment.blNumber!, 'bl', shipment.shippingLine)} disabled={Boolean(refreshing)}>
                        <RefreshCw className={cn('mr-2 size-3.5', refreshing === `bl:${shipment.blNumber}` && 'animate-spin')} />
                        Actualiser BL
                      </Button>
                    ) : null}
                    {shipment.vesselName ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => refreshExternal(shipment.vesselName!, 'vessel')} disabled={Boolean(refreshing)}>
                        <RefreshCw className={cn('mr-2 size-3.5', refreshing === `vessel:${shipment.vesselName}` && 'animate-spin')} />
                        Actualiser AIS
                      </Button>
                    ) : null}
                    <Button asChild size="sm">
                      <a href={getCarrierTrackingUrl(carrier, shipment.blNumber)} target="_blank" rel="noreferrer">
                        Ouvrir {carrier.name}
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setView('case-detail', { id: shipment.case.id })}
                    >
                      Voir le dossier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
    </div>
  )
}
