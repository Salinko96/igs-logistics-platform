import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { checkLoginAllowed, clearLoginFailures, loginKey, recordLoginFailure } from '@/lib/security/login-throttle'

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })

  const ipAddress = requestIp(request)
  const identifierHash = loginKey(email)
  const gate = await checkLoginAllowed(identifierHash)
  if (!gate.allowed) return NextResponse.json({ error: 'Compte temporairement verrouillé après plusieurs échecs. Réessayez dans 15 minutes.', code: 'LOGIN_LOCKED' }, { status: 423 })

  const knownProfile = await db.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, organizationId: true, isActive: true, role: true } })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user || !knownProfile?.isActive) {
    const failure = await recordLoginFailure({ identifierHash, email, ipAddress, organizationId: knownProfile?.organizationId })
    if (knownProfile) await logAudit({ organizationId: knownProfile.organizationId, profileId: knownProfile.id, action: failure.lockedUntil ? 'login_locked' : 'login_failed', entityType: 'auth', details: { failedCount: failure.failedCount }, request })
    return NextResponse.json({ error: failure.lockedUntil ? 'Compte temporairement verrouillé après plusieurs échecs.' : 'Identifiants invalides.' }, { status: failure.lockedUntil ? 423 : 401 })
  }

  await clearLoginFailures(identifierHash)
  await logAudit({ organizationId: knownProfile.organizationId, profileId: knownProfile.id, action: 'login', entityType: 'auth', details: { assurance: 'aal1' }, request })
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const destination = typeof body.next === 'string' && body.next.startsWith('/') ? body.next : knownProfile.role === 'CLIENT' ? '/portail' : '/dashboard'
  const mfaSetupRequired = knownProfile.role === 'ADMIN' && assurance?.nextLevel !== 'aal2'
  const mfaVerificationRequired = knownProfile.role === 'ADMIN' || (assurance?.currentLevel === 'aal1' && assurance?.nextLevel === 'aal2')

  return NextResponse.json({ destination, mfaSetupRequired, mfaVerificationRequired })
}
