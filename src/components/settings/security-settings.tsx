'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Trash2 } from 'lucide-react'

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string }
const supabase = createClient()

export function SecuritySettings({ adminRequired = true }: { adminRequired?: boolean }) {
  const [factors, setFactors] = useState<Factor[]>([])
  const [message, setMessage] = useState('')

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp ?? [])
  }

  useEffect(() => { void loadFactors() }, [supabase])

  async function removeFactor(factorId: string) {
    if (adminRequired && verified.length <= 1) {
      setMessage('Le dernier facteur 2FA ne peut pas être retiré d’un compte administrateur.')
      return
    }
    setMessage('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) setMessage(error.message)
    else {
      setMessage('Facteur 2FA supprimé.')
      await loadFactors()
    }
  }

  const verified = factors.filter((factor) => factor.status === 'verified')
  return (
    <div className="mt-8 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" />Authentification à deux facteurs</h3><p className="text-xs text-muted-foreground">{adminRequired ? 'Obligatoire pour les administrateurs. Chaque session doit atteindre le niveau AAL2.' : 'Protège les accès avec un code TOTP.'}</p></div>
        {verified.length === 0 ? <Button asChild size="sm" type="button"><Link href="/mfa-setup">Configurer le 2FA</Link></Button> : <Badge className="bg-green-100 text-green-700">Activé</Badge>}
      </div>
      {verified.map((factor) => <div key={factor.id} className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><span>{factor.friendly_name || 'Application TOTP'}</span><Button variant="ghost" size="sm" type="button" onClick={() => removeFactor(factor.id)}><Trash2 className="mr-2 size-4" />Retirer</Button></div>)}
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
