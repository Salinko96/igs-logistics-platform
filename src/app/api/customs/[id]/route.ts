import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { isValidHsCode } from '@/lib/customs/hs-codes'
import { logAudit } from '@/lib/audit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    const { id } = await params
    const existing = await db.customsDeclaration.findFirst({ where: { id, case: { organizationId: profile.organizationId } }, select: { id: true, caseId: true } })
    if (!existing) return NextResponse.json({ error: 'Déclaration introuvable' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const hsCode = body.hsCode === null ? null : typeof body.hsCode === 'string' ? body.hsCode.trim() : undefined
    if (hsCode && !isValidHsCode(hsCode)) return NextResponse.json({ error: 'Code HS invalide' }, { status: 400 })
    const updated = await db.customsDeclaration.update({ where: { id }, data: {
      ...(typeof body.status === 'string' ? { status: body.status.trim() } : {}),
      ...(hsCode !== undefined ? { hsCode } : {}),
      ...(typeof body.hsDescription === 'string' ? { hsDescription: body.hsDescription.trim() } : {}),
      ...(typeof body.gucegRef === 'string' ? { gucegRef: body.gucegRef.trim() } : {}),
      ...(typeof body.sydoniaRef === 'string' ? { sydoniaRef: body.sydoniaRef.trim() } : {}),
      ...(typeof body.notes === 'string' ? { notes: body.notes.trim() } : {}),
    } })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'update', entityType: 'customs_declaration', entityId: id, details: { status: updated.status }, request })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
