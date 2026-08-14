import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authorizeApi } from '@/lib/rbac/server'
import { calculateQuotation } from '@/lib/quotations'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi('read', 'devis'); if (!auth.allowed) return auth.response
    const status = request.nextUrl.searchParams.get('status')
    const where: Prisma.QuotationWhereInput = { organizationId: auth.profile.organizationId, ...(status ? { status } : {}) }
    const quotations = await db.quotation.findMany({ where, include: { client: { select: { name: true } }, commercial: { select: { firstName: true, lastName: true } }, items: true }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(quotations)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi('create', 'devis'); if (!auth.allowed) return auth.response
    const body = await request.json().catch(() => ({}))
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const lines = Array.isArray(body.items) ? body.items.map((item: Record<string, unknown>) => ({ description: String(item.description || ''), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) : []
    if (!clientId || !lines.length || lines.some((line) => !line.description.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) return NextResponse.json({ error: 'Client et lignes de devis valides requis' }, { status: 400 })
    const client = await db.client.findFirst({ where: { id: clientId, organizationId: auth.profile.organizationId, ...(auth.profile.role === 'COMMERCIAL' ? { OR: [{ commercialOwnerId: auth.profile.id }, { commercialOwnerId: null }] } : {}) }, select: { id: true } })
    if (!client) return NextResponse.json({ error: 'Client hors de votre portefeuille' }, { status: 404 })
    const totals = calculateQuotation(lines, 18)
    const year = new Date().getFullYear()
    const count = await db.quotation.count({ where: { organizationId: auth.profile.organizationId, createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } } })
    const quotationNumber = `DEV-${year}-${String(count + 1).padStart(4, '0')}`
    const currency = ['GNF', 'USD', 'EUR', 'CNY'].includes(body.currency) ? body.currency : 'GNF'
    const exchangeRateGnf = currency === 'GNF' ? 1 : Number(body.exchangeRateGnf)
    if (!Number.isFinite(exchangeRateGnf) || exchangeRateGnf <= 0) return NextResponse.json({ error: 'Taux de conversion GNF obligatoire' }, { status: 400 })
    const validUntil = body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 86400000)
    const quotation = await db.quotation.create({ data: { organizationId: auth.profile.organizationId, clientId, commercialId: auth.profile.id, quotationNumber, status: 'brouillon', currency, exchangeRateGnf, subtotal: totals.subtotal, taxRate: 18, taxAmount: totals.taxAmount, totalAmount: totals.totalAmount, validUntil, notes: typeof body.notes === 'string' ? body.notes.trim() || null : null, items: { create: totals.items } }, include: { client: true, items: true } })
    await logAudit({ organizationId: auth.profile.organizationId, profileId: auth.profile.id, action: 'create', entityType: 'quotation', entityId: quotation.id, details: { quotationNumber, totalAmount: totals.totalAmount, taxRate: 18 }, request })
    return NextResponse.json(quotation, { status: 201 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 }) }
}
