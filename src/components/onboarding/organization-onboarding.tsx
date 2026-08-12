'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OrganizationData = { name: string; address: string | null; city: string; country: string; phone: string | null; email: string | null; taxId: string | null }

export function OrganizationOnboarding({ organization }: { organization: OrganizationData }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: organization.name || '', address: organization.address || '', city: organization.city || 'Conakry', country: organization.country || 'Guinée', phone: organization.phone || '', email: organization.email || '', taxId: organization.taxId || '' })

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible')
      router.replace('/dashboard'); router.refresh()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Erreur inconnue') } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#eef3f1] px-4 py-10"><div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10"><header className="relative overflow-hidden bg-[#073e46] p-8 text-white"><div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-white/5" /><Building2 className="mb-5 h-10 w-10 text-amber-400" /><p className="text-xs font-semibold uppercase tracking-[.25em] text-cyan-200">Configuration initiale</p><h1 className="mt-2 text-3xl font-bold">Identité légale de votre organisation</h1><p className="mt-3 max-w-xl text-sm text-cyan-50/75">Ces informations apparaissent sur vos factures et sont obligatoires avant l’utilisation commerciale de la plateforme.</p></header><form onSubmit={submit} className="grid gap-5 p-8 sm:grid-cols-2">{Object.entries({ name: 'Raison sociale', address: 'Adresse', city: 'Ville', country: 'Pays', phone: 'Téléphone', email: 'Email professionnel', taxId: 'NIF' }).map(([key, label]) => <div key={key} className={key === 'address' ? 'grid gap-2 sm:col-span-2' : 'grid gap-2'}><Label htmlFor={key}>{label} *</Label><Input id={key} type={key === 'email' ? 'email' : 'text'} required value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></div>)}{error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="flex justify-end sm:col-span-2"><Button disabled={busy} className="bg-[#073e46] hover:bg-[#0a525d]"><CheckCircle2 className="mr-2 h-4 w-4" />{busy ? 'Enregistrement...' : 'Finaliser la configuration'}</Button></div></form></div></main>
}
