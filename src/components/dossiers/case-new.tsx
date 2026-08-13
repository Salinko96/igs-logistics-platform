'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { CASE_DIRECTIONS, CASE_TYPES, CURRENCIES, PRIORITIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calculator, Loader2, Save } from 'lucide-react'

type ClientItem = { id: string; name: string }
type ProfileItem = { id: string; firstName: string; lastName: string; role: string }
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']
const initialForm = { type: 'maritime', direction: 'import', priority: 'normale', clientId: '', serviceChefId: '', commercialId: '', description: '', merchandise: '', incoterm: '', weightKg: '', volumeM3: '', packageCount: '', declaredValue: '', declaredCurrency: 'GNF', supplier: '', shipper: '', consignee: '', originPort: '', destinationPort: '', etd: '', eta: '', ata: '', estimatedRevenue: '', estimatedCost: '', currency: 'GNF', notes: '' }

function Field({ label, value, onChange, type = 'text', required = false, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
  return <div className="grid gap-2"><Label>{label}{required ? ' *' : ''}</Label><Input type={type} value={value} min={min} step={type === 'number' ? '0.01' : undefined} required={required} onChange={(event) => onChange(event.target.value)} /></div>
}

export default function CaseNew() {
  const router = useRouter(); const setView = useAppStore((state) => state.setView)
  const [form, setForm] = useState(initialForm); const [isSubmitting, setIsSubmitting] = useState(false); const [error, setError] = useState<string | null>(null)
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const { data: clients = [] } = useQuery<ClientItem[]>({ queryKey: ['clients', 'active'], queryFn: async () => { const response = await fetch('/api/clients'); if (!response.ok) throw new Error('Clients indisponibles'); return response.json() } })
  const { data: profiles = [] } = useQuery<ProfileItem[]>({ queryKey: ['profiles', 'active'], queryFn: async () => { const response = await fetch('/api/profiles'); if (!response.ok) throw new Error('Responsables indisponibles'); return response.json() }, staleTime: 60_000 })
  const defaultChef = profiles[0]?.id || ''; const margin = (Number(form.estimatedRevenue) || 0) - (Number(form.estimatedCost) || 0)
  const canSubmit = Boolean(form.clientId && (form.serviceChefId || defaultChef))

  async function submit(event: FormEvent) {
    event.preventDefault(); setIsSubmitting(true); setError(null)
    try {
      const numeric = ['weightKg', 'volumeM3', 'packageCount', 'declaredValue', 'estimatedRevenue', 'estimatedCost'] as const
      const payload: Record<string, unknown> = { ...form, serviceChefId: form.serviceChefId || defaultChef }
      numeric.forEach((key) => { payload[key] = form[key] === '' ? null : Number(form[key]) })
      const response = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Création impossible')
      setView('case-detail', { id: data.id }); router.push('/dossiers')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Erreur inconnue') } finally { setIsSubmitting(false) }
  }

  return <div className="space-y-5"><div className="flex items-center gap-3"><Button type="button" variant="ghost" onClick={() => router.push('/dossiers')}><ArrowLeft className="mr-2 size-4" />Retour</Button><div><h1 className="text-2xl font-bold">Nouveau dossier</h1><p className="text-sm text-muted-foreground">Fiche opérationnelle et financière complète</p></div></div><form onSubmit={submit} className="space-y-5">
    <Card><CardHeader><CardTitle>Identification</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><div className="grid gap-2"><Label>Type *</Label><Select value={form.type} onValueChange={(value) => update('type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CASE_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Direction *</Label><Select value={form.direction} onValueChange={(value) => update('direction', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CASE_DIRECTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Priorité</Label><Select value={form.priority} onValueChange={(value) => update('priority', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Client *</Label><Select value={form.clientId} onValueChange={(value) => update('clientId', value)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{clients.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Responsable *</Label><Select value={form.serviceChefId || defaultChef} onValueChange={(value) => update('serviceChefId', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{profiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.firstName} {item.lastName}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Commercial</Label><Select value={form.commercialId || 'none'} onValueChange={(value) => update('commercialId', value === 'none' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucun</SelectItem>{profiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.firstName} {item.lastName}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2 md:col-span-3"><Label>Description</Label><Textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Marchandise et parties</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="Marchandise" value={form.merchandise} onChange={(value) => update('merchandise', value)} /><div className="grid gap-2"><Label>Incoterm</Label><Select value={form.incoterm} onValueChange={(value) => update('incoterm', value)}><SelectTrigger><SelectValue placeholder="EXW, FOB, CIF..." /></SelectTrigger><SelectContent>{INCOTERMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Field label="Valeur marchandise" type="number" min="0" value={form.declaredValue} onChange={(value) => update('declaredValue', value)} /><Field label="Poids brut (kg)" type="number" min="0" value={form.weightKg} onChange={(value) => update('weightKg', value)} /><Field label="Volume (m³)" type="number" min="0" value={form.volumeM3} onChange={(value) => update('volumeM3', value)} /><Field label="Nombre de colis" type="number" min="0" value={form.packageCount} onChange={(value) => update('packageCount', value)} /><Field label="Fournisseur" value={form.supplier} onChange={(value) => update('supplier', value)} /><Field label="Expéditeur" value={form.shipper} onChange={(value) => update('shipper', value)} /><Field label="Destinataire" value={form.consignee} onChange={(value) => update('consignee', value)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Itinéraire et dates</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="Origine" value={form.originPort} onChange={(value) => update('originPort', value)} /><Field label="Destination" value={form.destinationPort} onChange={(value) => update('destinationPort', value)} /><div /><Field label="ETD prévue" type="date" value={form.etd} onChange={(value) => update('etd', value)} /><Field label="ETA prévue" type="date" value={form.eta} onChange={(value) => update('eta', value)} /><Field label="ATA réelle" type="date" value={form.ata} onChange={(value) => update('ata', value)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Prévision financière</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="Revenu estimé" type="number" min="0" value={form.estimatedRevenue} onChange={(value) => update('estimatedRevenue', value)} /><Field label="Coût estimé" type="number" min="0" value={form.estimatedCost} onChange={(value) => update('estimatedCost', value)} /><div className={`rounded-xl border p-4 ${margin < 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"><Calculator className="h-4 w-4" />Marge estimée</p><p className={`mt-2 text-2xl font-bold ${margin < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{new Intl.NumberFormat('fr-FR').format(margin)} {form.currency}</p></div><div className="grid gap-2"><Label>Devise</Label><Select value={form.currency} onValueChange={(value) => { update('currency', value); update('declaredCurrency', value) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.code} · {item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2 md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} /></div></CardContent></Card>
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="flex justify-end"><Button type="submit" disabled={isSubmitting || !canSubmit}>{isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Créer le dossier</Button></div>
  </form></div>
}
