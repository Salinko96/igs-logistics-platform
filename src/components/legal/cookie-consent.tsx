'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/react'
import { Cookie, Settings2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

const CONSENT_COOKIE = 'igs-cookie-consent'
const CONSENT_EVENT = 'igs:manage-cookies'
const SIX_MONTHS = 60 * 60 * 24 * 180

type Consent = { analytics: boolean; decidedAt: string }

function readConsent(): Consent | null {
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE}=`))?.split('=').slice(1).join('=')
  if (!value) return null
  try { return JSON.parse(decodeURIComponent(value)) as Consent } catch { return null }
}

function saveConsent(analytics: boolean): Consent {
  const consent = { analytics, decidedAt: new Date().toISOString() }
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=${SIX_MONTHS}; samesite=lax; secure`
  return consent
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = readConsent()
      setConsent(current)
      setAnalytics(current?.analytics ?? false)
    }, 0)
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener(CONSENT_EVENT, openSettings)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(CONSENT_EVENT, openSettings)
    }
  }, [])

  function decide(allowAnalytics: boolean) {
    setConsent(saveConsent(allowAnalytics))
    setAnalytics(allowAnalytics)
    setSettingsOpen(false)
  }

  return <>
    {consent?.analytics ? <Analytics /> : null}
    {consent === null ? <aside aria-label="Consentement aux cookies" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-4xl rounded-2xl border border-slate-700/15 bg-[#102c28] p-4 text-white shadow-[0_24px_80px_rgb(15_23_42/0.35)] sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ef6c22]"><Cookie className="size-5" /></div><div><h2 className="font-semibold">Votre choix, sans cookies publicitaires</h2><p className="mt-1 text-sm leading-5 text-white/70">Les cookies nécessaires assurent la connexion et la sécurité. Avec votre accord, une mesure d’audience agrégée nous aide à améliorer IGS Nexus. <Link href="/cookies" className="text-[#f8ad78] underline">En savoir plus</Link>.</p></div></div>
        <div className="flex flex-wrap gap-2 md:justify-end"><Button variant="ghost" className="border border-white/15 text-white hover:bg-white/10 hover:text-white" onClick={() => decide(false)}>Tout refuser</Button><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" />Personnaliser</Button><Button onClick={() => decide(true)}>Tout accepter</Button></div>
      </div>
    </aside> : null}
    {consent ? <button type="button" onClick={() => setSettingsOpen(true)} className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur hover:bg-accent"><Cookie className="size-3.5" />Gérer les cookies</button> : null}
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><DialogTitle>Préférences de confidentialité</DialogTitle><DialogDescription>Choisissez les traceurs optionnels. Les cookies strictement nécessaires restent actifs.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4"><div><p className="font-medium">Nécessaires</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Authentification, 2FA, sécurité, langue et état de l’interface.</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Toujours actifs</span></div>
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4"><div><p className="font-medium">Mesure d’audience</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Statistiques agrégées Vercel pour comprendre les performances et l’usage.</p></div><Switch aria-label="Autoriser la mesure d’audience" checked={analytics} onCheckedChange={setAnalytics} /></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => decide(false)}>Tout refuser</Button><Button onClick={() => decide(analytics)}>Enregistrer mon choix</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(CONSENT_EVENT))
}
