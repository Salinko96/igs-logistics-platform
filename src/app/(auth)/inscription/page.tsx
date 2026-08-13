'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Check, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { readJson } from '@/lib/http'

const benefits = [
  'Essai Starter gratuit pendant 14 jours',
  'Aucune carte bancaire requise',
  '2FA obligatoire pour les administrateurs',
  'Données isolées par organisation',
]

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', organizationName: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (form.password.length < 10 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
        throw new Error('Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.')
      }
      const response = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await readJson<{ message?: string; error?: string }>(response)
      if (!response.ok) throw new Error(body.error || 'Inscription impossible')
      setMessage({ type: 'success', text: body.message || 'Compte créé avec succès.' })
      window.setTimeout(() => router.push('/login?signup=success'), 1800)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Inscription impossible' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#fff1df_0,transparent_35%),linear-gradient(140deg,#f8faf7_0%,#e8f2ee_100%)] p-3 sm:p-5 md:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-[calc(100vw-1.5rem)] min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border bg-white shadow-[0_30px_100px_rgb(16_44_40/0.15)] sm:w-[calc(100vw-2.5rem)] md:w-[calc(100vw-5rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#102c28] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10 bg-white/5" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[#f28a42]">IGS Nexus</p>
            <h1 className="mt-8 max-w-lg text-5xl font-bold leading-[1.05]">Pilotez votre logistique depuis un seul espace.</h1>
            <p className="mt-5 max-w-md text-white/65">Un environnement sécurisé pour le transit, la douane, les documents et la facturation en Guinée.</p>
          </div>
          <ul className="space-y-4 text-sm text-white/80">
            {benefits.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ef6c22]"><Check className="size-4" /></span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex w-full min-w-0 max-w-full items-center overflow-hidden p-4 sm:p-6 md:p-12">
          <Card className="w-full min-w-0 max-w-[calc(100vw-3.5rem)] overflow-hidden border-0 shadow-none sm:max-w-full">
            <CardHeader className="min-w-0 px-0">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 /></div>
              <CardTitle className="text-2xl sm:text-3xl">Créer votre organisation</CardTitle>
              <p className="max-w-full [overflow-wrap:anywhere] text-sm text-muted-foreground">Votre espace Starter est opérationnel en quelques minutes.</p>
            </CardHeader>
            <CardContent className="min-w-0 px-0">
              <form onSubmit={submit} className="min-w-0 space-y-4">
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2"><Label>Prénom</Label><Input className="w-full" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /></div>
                  <div className="min-w-0 space-y-2"><Label>Nom</Label><Input className="w-full" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /></div>
                </div>
                <div className="min-w-0 space-y-2"><Label>Raison sociale</Label><Input className="w-full" value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} required /></div>
                <div className="min-w-0 space-y-2"><Label>Email professionnel</Label><Input className="w-full" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
                <div className="min-w-0 space-y-2">
                  <Label>Mot de passe</Label>
                  <Input className="w-full" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={10} required />
                  <p className="max-w-full break-words text-xs text-muted-foreground">10 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial.</p>
                </div>
                {message ? <div className={message.type === 'success' ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800' : 'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'}>{message.text}</div> : null}
                <Button type="submit" className="h-11 w-full" disabled={busy || message?.type === 'success'}>
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                  {busy ? 'Création sécurisée...' : 'Démarrer mon essai'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">Déjà inscrit ? <Link href="/login" className="font-semibold text-primary">Se connecter</Link></p>
                <p className="text-center text-xs leading-5 text-muted-foreground">En créant votre espace, vous acceptez nos <Link href="/conditions-generales" className="font-medium text-primary hover:underline">conditions générales</Link> et reconnaissez avoir lu notre <Link href="/confidentialite" className="font-medium text-primary hover:underline">politique de confidentialité</Link>.</p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
