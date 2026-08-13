'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) setMessage({ type: 'error', text: body.error || 'Impossible d’envoyer le lien.' })
    else setMessage({ type: 'success', text: `${body.message} Consultez votre boîte mail.` })
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <Card className="w-full max-w-[420px] border border-border bg-white shadow-[0_24px_70px_rgb(36_34_41/0.10)] dark:bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound /></div>
          <CardTitle className="text-2xl">Mot de passe oublié ?</CardTitle>
          <p className="text-sm text-muted-foreground">Saisissez votre email pour recevoir un lien sécurisé.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Adresse email</Label>
              <Input id="forgot-email" type="email" placeholder="votre.email@igsgf.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
            </div>
            {message ? <div role="alert" className={message.type === 'success' ? 'rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800' : 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'}><Mail className="mr-2 inline size-4" />{message.text}</div> : null}
            <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}{loading ? 'Envoi en cours...' : 'Envoyer le lien'}</Button>
            <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />Retour à la connexion</Link>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
