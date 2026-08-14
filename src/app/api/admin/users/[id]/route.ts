import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const ROLES = ['COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'] as const
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: adminProfile } = await getSessionProfile()
  if (!adminProfile || adminProfile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  const { id } = await params; const body = await request.json().catch(() => ({}))
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : body.action === 'disable' ? 'disable' : null
  if (!action) return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  const target = await db.profile.findFirst({ where: { id, organizationId: adminProfile.organizationId } })
  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  const requestedRole = typeof body.role === 'string' ? body.role.toUpperCase() : target.requestedRole
  if (action === 'approve' && !ROLES.includes(requestedRole as (typeof ROLES)[number])) return NextResponse.json({ error: 'Rôle métier requis' }, { status: 400 })
  const approved = action === 'approve'
  const updated = await db.profile.update({ where: { id }, data: { ...(approved ? { role: requestedRole as (typeof ROLES)[number], approvalStatus: 'approved', isActive: true, approvedAt: new Date(), approvedById: adminProfile.id } : action === 'reject' ? { approvalStatus: 'rejected', isActive: false } : { isActive: false }) } })
  const authAdmin = createAdminClient()
  await authAdmin.auth.admin.updateUserById(target.userId, { ...(approved ? { email_confirm: true, ban_duration: 'none' } : { ban_duration: '876000h' }), user_metadata: { role: approved ? requestedRole : 'PENDING', requested_role: target.requestedRole, organization_id: target.organizationId, first_name: target.firstName, last_name: target.lastName } })
  await logAudit({ organizationId: adminProfile.organizationId, profileId: adminProfile.id, action: `user_${action}`, entityType: 'profile', entityId: id, details: { role: approved ? requestedRole : null }, request })
  return NextResponse.json(updated)
}
