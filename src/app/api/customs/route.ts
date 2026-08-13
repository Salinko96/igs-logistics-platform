import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { isValidHsCode } from '@/lib/customs/hs-codes'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const declarations = await db.customsDeclaration.findMany({
      where: { case: { organizationId: profile.organizationId, ...(profile.role === 'CLIENT' ? { clientId: profile.clientId ?? '__none__' } : {}) } },
      include: { case: { select: { id: true, reference: true, client: { select: { name: true } } } }, events: { orderBy: { performedAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(declarations)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    if (!caseId) return NextResponse.json({ error: 'Dossier requis' }, { status: 400 })
    const caseRecord = await db.case.findFirst({ where: { id: caseId, organizationId: profile.organizationId }, select: { id: true } })
    if (!caseRecord) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    const hsCode = typeof body.hsCode === 'string' && body.hsCode.trim() ? body.hsCode.trim() : null
    if (hsCode && !isValidHsCode(hsCode)) return NextResponse.json({ error: 'Code HS invalide : 4, 6, 8 ou 10 chiffres attendus' }, { status: 400 })
    const customsValue = body.customsValue == null ? null : Number(body.customsValue)
    const tariffRate = body.tariffRate == null ? null : Number(body.tariffRate)
    if ((customsValue !== null && (!Number.isFinite(customsValue) || customsValue < 0)) || (tariffRate !== null && (!Number.isFinite(tariffRate) || tariffRate < 0 || tariffRate > 100))) return NextResponse.json({ error: 'Valeur douanière ou taux invalide' }, { status: 400 })
    const dutyAmount = customsValue !== null && tariffRate !== null ? customsValue * tariffRate / 100 : null
    const vatRate = body.vatRate == null ? 18 : Number(body.vatRate)
    const vatAmount = customsValue !== null && Number.isFinite(vatRate) ? (customsValue + (dutyAmount ?? 0)) * vatRate / 100 : null
    const declaration = await db.customsDeclaration.create({
      data: {
        caseId,
        regime: typeof body.regime === 'string' ? body.regime.trim() : null,
        declarationType: typeof body.declarationType === 'string' ? body.declarationType.trim() : null,
        hsCode,
        hsDescription: typeof body.hsDescription === 'string' ? body.hsDescription.trim() : null,
        tariffRate,
        countryOfOrigin: typeof body.countryOfOrigin === 'string' ? body.countryOfOrigin.trim() : null,
        countryOfDestination: typeof body.countryOfDestination === 'string' ? body.countryOfDestination.trim() : null,
        customsValue,
        customsValueCurrency: typeof body.customsValueCurrency === 'string' ? body.customsValueCurrency.trim() : 'GNF',
        dutyAmount,
        vatAmount,
        gucegRef: typeof body.gucegRef === 'string' ? body.gucegRef.trim() : null,
        sydoniaRef: typeof body.sydoniaRef === 'string' ? body.sydoniaRef.trim() : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      },
    })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'create', entityType: 'customs_declaration', entityId: declaration.id, details: { caseId, hsCode }, request })
    return NextResponse.json(declaration, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
