import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { assertSaaSQuota, quotaErrorResponse } from '@/lib/saas/usage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const profiles = await db.profile.findMany({
      where: { organizationId: profile.organizationId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json(profiles)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile: sessionProfile } = await getSessionProfile()
    if (!user || !sessionProfile || sessionProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const body = await request.json()
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Prénom, nom et email requis' },
        { status: 400 },
      )
    }

    await assertSaaSQuota(sessionProfile.organizationId, 'users')

    const allowedRoles = ['ADMIN', 'AGENT', 'CLIENT'] as const
    const requestedRole = typeof body.role === 'string' ? body.role.trim().toUpperCase() : 'AGENT'
    const role = allowedRoles.includes(requestedRole as (typeof allowedRoles)[number])
      ? requestedRole
      : 'AGENT'

    const created = await db.profile.create({
      data: {
        organizationId: sessionProfile.organizationId,
        userId: typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : `u-${Date.now()}`,
        firstName,
        lastName,
        email,
        phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
        role: role as 'ADMIN' | 'AGENT' | 'CLIENT',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
      },
    })

    await logAudit({ organizationId: sessionProfile.organizationId, profileId: sessionProfile.id, action: 'create', entityType: 'profile', entityId: created.id, details: { role: created.role, email: created.email }, request })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const quota = quotaErrorResponse(error)
    if (quota) return NextResponse.json(quota, { status: 402 })
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
