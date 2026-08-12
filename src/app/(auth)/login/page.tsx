'use client'

import { useState, type FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, LockKeyhole } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

function LoginForm() {
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const next = searchParams.get('next')
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, next }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('auth.loginError'))
      if (data.mfaSetupRequired) window.location.href = `/mfa-setup?next=${encodeURIComponent(data.destination)}`
      else if (data.mfaVerificationRequired) window.location.href = `/mfa-verify?next=${encodeURIComponent(data.destination)}`
      else window.location.href = data.destination

      return
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-border bg-white px-4 py-2 shadow-[0_24px_70px_rgb(36_34_41/0.10)] dark:bg-card">
      <CardHeader className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white p-2">
          <Image src="/igs-icon.png" alt="IGS" width={32} height={32} />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          IGS Nexus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t('auth.email')}</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="votre.nom@igsgf.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">{t('auth.password')}</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LockKeyhole className="mr-2 size-4" />
            )}
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nouvelle entreprise ? <Link href="/inscription" className="font-semibold text-primary">Créer un espace</Link>
          </p>
          <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-xs text-muted-foreground">
            <Link href="/conditions-generales" className="hover:underline">Conditions</Link>
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="w-full max-w-[420px]">
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
