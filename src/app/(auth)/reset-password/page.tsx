'use client'

import { useEffect, useState, type FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { PASSWORD_POLICY_MESSAGE, validatePassword } from '@/lib/security/password'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')
    const prepare = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { setMessage({ type: 'error', text: 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.' }); setLoading(false); return }
      }
      const { data } = await supabase.auth.getSession()
      setReady(Boolean(data.session))
      if (!data.session) setMessage({ type: 'error', text: 'Ce lien de réinitialisation est invalide ou a expiré.' })
      setLoading(false)
    }
    void prepare()
  }, [searchParams])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (!validatePassword(password)) { setMessage({ type: 'error', text: PASSWORD_POLICY_MESSAGE }); return }
    if (password !== confirm) { setMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' }); return }
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) setMessage({ type: 'error', text: error.message })
    else { setMessage({ type: 'success', text: 'Mot de passe modifié. Redirection vers la connexion...' }); setTimeout(() => router.push('/login'), 1400) }
    setLoading(false)
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="absolute inset-x-0 top-0 h-1 bg-primary" /><Card className="w-full max-w-[420px] border border-border bg-white shadow-[0_24px_70px_rgb(36_34_41/0.10)] dark:bg-card"><CardHeader className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound /></div><CardTitle className="text-2xl">Nouveau mot de passe</CardTitle><p className="text-sm text-muted-foreground">Choisissez un nouveau mot de passe sécurisé.</p></CardHeader><CardContent>{loading && !ready ? <div className="flex justify-center py-8"><Loader2 className="size-7 animate-spin text-primary" /></div> : ready ? <form onSubmit={submit} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} disabled={loading} /></div><div className="space-y-1.5"><Label htmlFor="confirm-password">Confirmer le mot de passe</Label><Input id="confirm-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={10} disabled={loading} /></div><p className="text-xs text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>{message ? <div role="alert" className={message.type === 'success' ? 'rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800' : 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'}>{message.text}</div> : null}<Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}Modifier le mot de passe</Button></form> : <div className="space-y-4 text-center"><p className="text-sm text-muted-foreground">Demandez un nouveau lien de réinitialisation.</p><Link href="/mot-de-passe-oublie" className="block text-sm font-semibold text-primary hover:underline">Recevoir un nouveau lien</Link></div>}</CardContent></Card></main>
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-7 animate-spin text-primary" /></main>}><ResetPasswordForm /></Suspense>
}
