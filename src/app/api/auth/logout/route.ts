import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const { profile } = await getSessionProfile()
  if (profile) await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'logout', entityType: 'auth', request })
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
