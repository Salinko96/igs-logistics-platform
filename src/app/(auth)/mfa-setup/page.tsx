'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

const supabase = createClient()

function MfaSetupForm() {
  const searchParams = useSearchParams()
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)

  async function enroll() {
    setBusy(true)
    setError('')
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'IGS Nexus' })
    if (enrollError || !data) {
      setError(enrollError?.message || 'Impossible de préparer le 2FA.')
    } else {
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    }
    setBusy(false)
  }

  async function verify() {
    if (!/^\d{6}$/.test(code) || !factorId) {
      setError('Saisissez le code à 6 chiffres affiché par votre application.')
      return
    }
    setBusy(true)
    setError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setError(challengeError?.message || 'Vérification impossible.')
      setBusy(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (verifyError) setError('Code invalide ou expiré.')
    else setVerified(true)
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center"><ShieldCheck className="mx-auto mb-2 size-10 text-primary" /><CardTitle>Configurer le 2FA</CardTitle><CardDescription>Scannez le QR code avec Google Authenticator, 1Password ou une application équivalente.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {verified ? <><p className="text-center text-sm text-green-600">La double authentification est activée sur votre compte.</p><Button asChild className="w-full"><Link href={searchParams.get('next') || '/dashboard'}>Continuer</Link></Button></> : !factorId ? <Button className="w-full" onClick={enroll} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Générer le QR code</Button> : <>
            {qrCode ? <img src={qrCode} alt="QR code de configuration 2FA" className="mx-auto size-56 rounded border bg-white p-2" /> : null}
            <p className="text-center text-xs text-muted-foreground">Clé manuelle : <span className="font-mono">{secret}</span></p>
            <Input inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy} />
            <Button className="w-full" onClick={verify} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Activer le 2FA</Button>
          </>}
          {error && <p className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MfaSetupPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>}><MfaSetupForm /></Suspense>
}
