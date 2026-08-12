import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { assertSaaSQuota, quotaErrorResponse } from '@/lib/saas/usage'

export async function POST(request: NextRequest) {
  try {
    // 1. Check if user is logged in and has ADMIN role
    const { profile } = await getSessionProfile()
    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = typeof body.role === 'string' ? body.role.trim() : 'AGENT'
    const clientId = typeof body.clientId === 'string' && body.clientId.trim() ? body.clientId.trim() : null
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const organizationId = profile.organizationId

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, prénom et nom requis' },
        { status: 400 }
      )
    }

    if (!['ADMIN', 'AGENT', 'CLIENT'].includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide' },
        { status: 400 }
      )
    }

    await assertSaaSQuota(organizationId, 'users')

    // 3. Initialize Supabase Admin client
    const supabaseAdmin = createAdminClient()

    // 4. Invite user via Supabase Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        client_id: clientId,
        first_name: firstName,
        last_name: lastName,
        organization_id: organizationId,
      },
    })

    if (error) {
      throw error
    }

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'user_invited', entityType: 'profile', entityId: data.user?.id, details: { email, role }, request })

    return NextResponse.json({
      message: 'Utilisateur invité avec succès',
      user: data.user,
    }, { status: 201 })

  } catch (error) {
    const quota = quotaErrorResponse(error)
    if (quota) return NextResponse.json(quota, { status: 402 })
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
