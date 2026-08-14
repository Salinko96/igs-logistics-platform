import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import { db } from './db'
import { app_role } from '@prisma/client'
import { getHomePath } from './rbac/permissions'

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, profile: null }
  }

  try {
    // Fetch profile from Prisma database
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (profile?.role === 'ADMIN') {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.currentLevel !== 'aal2') return { user, profile: null, mfaRequired: true as const }
    }

    return { user, profile, mfaRequired: false as const }
  } catch (err) {
    console.error('Error fetching profile from database:', err)
    // User is authenticated but profile fetch failed (e.g. schema mismatch)
    // Return user so requireRole knows the user IS logged in
    return { user, profile: null, mfaRequired: false as const }
  }
}

export async function requireRole(...allowedRoles: app_role[]) {
  const session = await getSessionProfile()
  const { user, profile } = session

  if (!user) {
    redirect('/login')
  }

  if ('mfaRequired' in session && session.mfaRequired) redirect('/mfa-setup')

  // User is authenticated. If profile is missing or role doesn't match,
  // don't redirect to /login (that would cause a loop).
  // Instead, try to load a minimal profile as fallback.
  if (!profile) {
    // Profile fetch failed but user is authenticated.
    // Try a simpler query without the client include.
    try {
      const fallbackProfile = await db.profile.findUnique({
        where: { userId: user.id },
      })
      if (fallbackProfile && allowedRoles.includes(fallbackProfile.role)) {
        return { user, profile: fallbackProfile }
      }
    } catch {
      // Database completely unreachable
    }

    // Last resort: check role from Supabase user_metadata
    const metaRole = user.user_metadata?.role as app_role | undefined
    if (metaRole && allowedRoles.includes(metaRole)) {
      return { user, profile: null }
    }

    redirect('/unauthorized')
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized')
  }
  
  return { user, profile }
}

export async function requireWorkspaceRole(...allowedRoles: app_role[]) {
  const session = await getSessionProfile()
  if (!session.user) redirect('/login')
  if (!session.profile) redirect('/unauthorized')
  if (!allowedRoles.includes(session.profile.role)) redirect(getHomePath(session.profile.role))
  return { user: session.user, profile: session.profile }
}
