'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mfaSetupUrl, safeMfaDestination } from '@/lib/security/mfa-navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

const supabase = createClient()

function MfaVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = safeMfaDestination(searchParams.get('next'))
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)

  useEffect(() => {
    let active = true
    void supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (!active) return
      if (listError) {
        setError(listError.message)
        setLoading(false)
        return
      }
      const factor = data?.totp?.find((item) => item.status === 'verified')
      if (!factor) {
        setSetupRequired(true)
        setLoading(false)
        router.replace(mfaSetupUrl(destination))
        return
      }
      setFactorId(factor.id)
      setLoading(false)
    })
    return () => { active = false }
  }, [destination, router])

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError('Saisissez le code à 6 chiffres de votre application d’authentification.')
      return
    }
    setBusy(true)
    setError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setError(challengeError?.message || 'Impossible de démarrer la vérification.')
      setBusy(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (verifyError) {
      setError('Code invalide ou expiré.')
      setBusy(false)
      return
    }
    window.location.href = destination
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto mb-2 size-10 text-primary" />
          <CardTitle>Vérification en deux étapes</CardTitle>
          <CardDescription>Entrez le code affiché dans votre application d’authentification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Loader2 className="mx-auto size-6 animate-spin" /> : setupRequired ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">Aucune application d’authentification n’est encore liée à ce compte.</p>
              <Button asChild className="w-full"><Link href={mfaSetupUrl(destination)}>Configurer le 2FA</Link></Button>
            </div>
          ) : (
            <>
              <Input inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy || !factorId} />
              {error && <p className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
              <Button className="w-full" onClick={verify} disabled={busy || !factorId}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Vérifier</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MfaVerifyPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>}><MfaVerifyForm /></Suspense>
}
