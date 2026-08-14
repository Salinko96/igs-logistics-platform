import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export async function GET() {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || !profile.isActive || profile.approvalStatus !== 'approved') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const latest = await db.auditLog.findFirst({ where: { organizationId: profile.organizationId }, select: { createdAt: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ version: latest?.createdAt.toISOString() || null }, { headers: { 'Cache-Control': 'private, no-store' } })
}
