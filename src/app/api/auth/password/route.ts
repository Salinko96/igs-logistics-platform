import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { PASSWORD_POLICY_MESSAGE, validatePassword } from '@/lib/security/password'

export async function PUT(request: NextRequest) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile) return NextResponse.json({ error: 'Session sécurisée requise' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const nextPassword = typeof body.nextPassword === 'string' ? body.nextPassword : ''
  if (!validatePassword(nextPassword)) return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 })
  if (currentPassword === nextPassword) return NextResponse.json({ error: 'Le nouveau mot de passe doit être différent.' }, { status: 400 })

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email || profile.email, password: currentPassword })
  if (verifyError) return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 401 })
  const { error } = await supabase.auth.updateUser({ password: nextPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'password_changed', entityType: 'auth', request })
  return NextResponse.json({ success: true })
}
