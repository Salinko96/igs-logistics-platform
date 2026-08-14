import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { can, type PermissionAction, type PermissionResource } from './permissions'

export async function authorizeApi(action: PermissionAction, resource: PermissionResource) {
  const session = await getSessionProfile()
  if (!session.user || !session.profile) {
    return { allowed: false as const, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }
  if (!can(session.profile.role, action, resource)) {
    return { allowed: false as const, response: NextResponse.json({ error: 'Accès interdit' }, { status: 403 }) }
  }
  return { allowed: true as const, user: session.user, profile: session.profile }
}
