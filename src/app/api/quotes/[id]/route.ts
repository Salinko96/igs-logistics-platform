import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authorizeApi } from '@/lib/rbac/server'
import { logAudit } from '@/lib/audit'

const STATUSES = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire']
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi('update', 'devis'); if (!auth.allowed) return auth.response
  const { id } = await params; const body = await request.json().catch(() => ({})); const status = String(body.status || '')
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  const quotation = await db.quotation.findFirst({ where: { id, organizationId: auth.profile.organizationId, ...(auth.profile.role === 'COMMERCIAL' ? { commercialId: auth.profile.id } : {}) } })
  if (!quotation) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  const updated = await db.quotation.update({ where: { id }, data: { status, acceptedAt: status === 'accepte' ? new Date() : null } })
  await logAudit({ organizationId: auth.profile.organizationId, profileId: auth.profile.id, action: 'update_status', entityType: 'quotation', entityId: id, details: { from: quotation.status, to: status }, request })
  return NextResponse.json(updated)
}
