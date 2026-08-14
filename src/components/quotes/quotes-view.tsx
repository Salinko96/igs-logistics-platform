'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePlus2, Send, CheckCircle2, XCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatGNF, formatDate } from '@/lib/constants'
import { PageHero } from '@/components/shared/page-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Quote = { id: string; quotationNumber: string; status: string; currency: string; exchangeRateGnf: number; subtotal: number; taxAmount: number; totalAmount: number; validUntil: string | null; client: { name: string } }
const labels: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', expire: 'Expiré' }
const colors: Record<string, string> = { brouillon: 'bg-slate-100 text-slate-700', envoye: 'bg-cyan-100 text-cyan-800', accepte: 'bg-emerald-100 text-emerald-800', refuse: 'bg-red-100 text-red-800', expire: 'bg-amber-100 text-amber-800' }

export default function QuotesView() {
  const setView = useAppStore((state) => state.setView); const queryClient = useQueryClient()
  const { data = [], isLoading, error } = useQuery<Quote[]>({ queryKey: ['quotes'], queryFn: async () => { const response = await fetch('/api/quotes'); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload } })
  const setStatus = async (id: string, status: string) => { const response = await fetch(`/api/quotes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (response.ok) await queryClient.invalidateQueries({ queryKey: ['quotes'] }) }
  return <div className="space-y-6"><PageHero eyebrow="VENTE & CONVERSION" title="Devis commerciaux" description="Prestations, TVA 18 % et équivalent GNF avant ouverture du dossier." actions={<Button onClick={() => setView('quote-new')}><FilePlus2 className="mr-2 h-4 w-4" />Nouveau devis</Button>} />
    <Card className="overflow-hidden">{isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Chargement des devis…</p> : error ? <p className="p-8 text-center text-sm text-destructive">{error instanceof Error ? error.message : 'Données indisponibles'}</p> : data.length === 0 ? <div className="p-10 text-center"><FilePlus2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">Aucun devis dans votre portefeuille</p><p className="text-sm text-muted-foreground">Créez le premier devis pour qualifier une opportunité.</p></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Devis</TableHead><TableHead>Client</TableHead><TableHead>HT</TableHead><TableHead>TVA 18 %</TableHead><TableHead>TTC</TableHead><TableHead>Équivalent GNF</TableHead><TableHead>Validité</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader><TableBody>{data.map((quote) => <TableRow key={quote.id}><TableCell className="font-semibold">{quote.quotationNumber}</TableCell><TableCell>{quote.client.name}</TableCell><TableCell>{formatGNF(quote.subtotal)}</TableCell><TableCell>{formatGNF(quote.taxAmount)}</TableCell><TableCell className="font-semibold">{formatGNF(quote.totalAmount)}</TableCell><TableCell>{formatGNF(quote.totalAmount * quote.exchangeRateGnf)}</TableCell><TableCell>{quote.validUntil ? formatDate(quote.validUntil) : '—'}</TableCell><TableCell><Badge className={colors[quote.status]}>{labels[quote.status] || quote.status}</Badge></TableCell><TableCell><div className="flex gap-1">{quote.status === 'brouillon' && <Button size="icon" variant="ghost" aria-label="Envoyer" onClick={() => void setStatus(quote.id, 'envoye')}><Send className="h-4 w-4" /></Button>}{quote.status === 'envoye' && <><Button size="icon" variant="ghost" aria-label="Accepter" onClick={() => void setStatus(quote.id, 'accepte')}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" aria-label="Refuser" onClick={() => void setStatus(quote.id, 'refuse')}><XCircle className="h-4 w-4 text-red-600" /></Button></>}</div></TableCell></TableRow>)}</TableBody></Table></div>}</Card>
  </div>
}
