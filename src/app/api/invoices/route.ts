import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { calculateInvoice, VAT_REGIMES, type InvoiceLineInput, type VatRegime } from '@/lib/invoicing'
import { missingLegalOrganizationFields } from '@/lib/organization'
import { paginationMeta, parsePagination } from '@/lib/pagination'
import type { Prisma } from '@prisma/client'
import { notifyRoles } from '@/lib/workflow-notifications'

export const dynamic = 'force-dynamic'

const INVOICE_STATUSES = ['brouillon', 'emise', 'envoyee', 'payee', 'partiellement_payee', 'echue', 'annulee']

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function dateValue(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const baseWhere: Prisma.InvoiceWhereInput = profile.role === 'CLIENT'
      ? { organizationId: profile.organizationId, clientId: profile.clientId || '__none__' }
      : { organizationId: profile.organizationId }
    const organization = await db.organization.findUnique({ where: { id: profile.organizationId }, select: { name: true, address: true, city: true, country: true, phone: true, email: true, taxId: true } })
    const missingLegalFields = organization ? missingLegalOrganizationFields(organization) : ['Organisation']
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams, 15)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const where: Prisma.InvoiceWhereInput = { ...baseWhere }
    if (status && status !== 'all') where.status = status
    if (search) where.OR = [{ invoiceNumber: { contains: search, mode: 'insensitive' } }, { client: { name: { contains: search, mode: 'insensitive' } } }, { case: { reference: { contains: search, mode: 'insensitive' } } }]

    const invoices = await db.invoice.findMany({ where, include: {
        organization: { select: { name: true } },
        client: { select: { name: true } },
        case: { select: { reference: true } },
      }, orderBy: { createdAt: 'desc' }, skip, take: pageSize })
    const total = await db.invoice.count({ where })
    const aggregate = await db.invoice.aggregate({ where: { ...baseWhere, status: { not: 'annulee' } }, _sum: { netAmount: true, paidAmount: true, amountPayable: true } })
    const overdue = await db.invoice.count({ where: { ...baseWhere, status: { notIn: ['annulee', 'payee'] }, dueDate: { lt: new Date() } } })
    const dueSoonLimit = new Date()
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 7)
    const dueSoon = await db.invoice.count({ where: { ...baseWhere, status: { notIn: ['annulee', 'payee'] }, dueDate: { gte: new Date(), lte: dueSoonLimit } } })
    const billed = aggregate._sum.netAmount ?? 0
    const collected = aggregate._sum.paidAmount ?? 0
    const payableTotal = aggregate._sum.amountPayable ?? billed
    const collectionAlertThreshold = Math.min(100, Math.max(0, Number(process.env.COLLECTION_ALERT_THRESHOLD_PERCENT) || 40))
    return NextResponse.json({ items: invoices, pagination: paginationMeta(total, page, pageSize), summary: { billed, collected, outstanding: Math.max(0, payableTotal - collected), overdue, dueSoon, collectionAlertThreshold, legalIdentityComplete: missingLegalFields.length === 0, missingLegalFields } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || !['ADMIN', 'AGENT', 'COMPTABLE', 'EXPLOITANT'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    const body = await request.json()
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
    if (!clientId) return NextResponse.json({ error: 'Sélectionnez un client' }, { status: 400 })

    const organization = await db.organization.findFirst({ where: { id: profile.organizationId, isActive: true }, select: { id: true, name: true, address: true, city: true, country: true, phone: true, email: true, taxId: true } })
    const client = await db.client.findFirst({ where: { id: clientId, organizationId: profile.organizationId }, select: { id: true } })
    if (!organization) return NextResponse.json({ error: 'Organisation active introuvable' }, { status: 404 })
    const missingLegalFields = missingLegalOrganizationFields(organization)
    if (missingLegalFields.length) {
      return NextResponse.json({
        error: `Complétez les informations de votre organisation avant de facturer : ${missingLegalFields.join(', ')}.`,
        code: 'ORGANIZATION_INCOMPLETE',
      }, { status: 409 })
    }
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const caseId = typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null
    if (caseId && !await db.case.findFirst({ where: { id: caseId, organizationId: organization.id, clientId }, select: { id: true } })) {
      return NextResponse.json({ error: 'Ce dossier ne correspond pas au client sélectionné' }, { status: 400 })
    }

    const sourceItems = Array.isArray(body.items) ? body.items : [{ description: body.description, quantity: 1, unitPrice: body.totalAmount, taxRate: body.taxRate }]
    const items: InvoiceLineInput[] = sourceItems.map((item: Record<string, unknown>) => ({
      description: typeof item.description === 'string' ? item.description.trim() : '',
      quantity: numberValue(item.quantity, 1),
      unit: typeof item.unit === 'string' ? item.unit.trim() : 'unité',
      unitPrice: numberValue(item.unitPrice),
      discountRate: numberValue(item.discountRate),
      taxRate: numberValue(item.taxRate, 18),
    }))
    if (!items.length || items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice < 0 || (item.discountRate ?? 0) < 0 || (item.discountRate ?? 0) > 100 || (item.taxRate ?? 0) < 0)) {
      return NextResponse.json({ error: 'Vérifiez la description, la quantité, le prix et les taux de chaque ligne' }, { status: 400 })
    }

    const vatRegime: VatRegime = VAT_REGIMES.includes(body.vatRegime) ? body.vatRegime : 'standard'
    const vatWithholdingRate = numberValue(body.vatWithholdingRate)
    const withholdingTaxRate = numberValue(body.withholdingTaxRate)
    if (![0, 50].includes(vatWithholdingRate) || ![0, 10, 15].includes(withholdingTaxRate)) {
      return NextResponse.json({ error: 'Taux de retenue non autorisé' }, { status: 400 })
    }
    const totals = calculateInvoice(items, { vatRegime, vatWithholdingRate, withholdingTaxRate })
    if (totals.totalAmount <= 0) return NextResponse.json({ error: 'Le montant HT doit être supérieur à zéro' }, { status: 400 })
    const legalReference = typeof body.vatLegalReference === 'string' ? body.vatLegalReference.trim() : ''
    if (vatRegime !== 'standard' && !legalReference) return NextResponse.json({ error: 'Indiquez la référence légale du taux zéro ou de l’exonération' }, { status: 400 })

    const settings = await db.organizationSettings.findUnique({ where: { organizationId: organization.id }, select: { invoicePrefix: true, currency: true } })
    const year = new Date().getFullYear()
    const prefix = settings?.invoicePrefix?.trim() || 'FAC'
    const latest = await db.invoice.findFirst({ where: { organizationId: organization.id, invoiceNumber: { startsWith: `${prefix}-${year}-` } }, select: { invoiceNumber: true }, orderBy: { invoiceNumber: 'desc' } })
    const next = latest ? numberValue(latest.invoiceNumber.split('-').at(-1), 0) + 1 : 1
    const invoiceNumber = `${prefix}-${year}-${String(next).padStart(4, '0')}`
    const status = profile.role === 'EXPLOITANT' ? 'brouillon' : INVOICE_STATUSES.includes(body.status) ? body.status : 'brouillon'
    const issuedAt = dateValue(body.issuedAt) || (status === 'brouillon' ? null : new Date())

    const invoice = await db.invoice.create({
      data: {
        organizationId: organization.id, clientId, caseId, invoiceNumber, status, issuedAt,
        supplyDate: dateValue(body.supplyDate), dueDate: dateValue(body.dueDate),
        paidAmount: 0, totalAmount: totals.totalAmount, currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : settings?.currency || 'GNF',
        taxRate: vatRegime === 'standard' ? numberValue(items[0]?.taxRate, 18) : 0,
        taxAmount: totals.taxAmount, netAmount: totals.netAmount, discountAmount: totals.discountAmount,
        vatRegime, vatLegalReference: legalReference || null, vatWithholdingRate, vatWithholdingAmount: totals.vatWithholdingAmount,
        withholdingTaxRate, withholdingTaxAmount: totals.withholdingTaxAmount, amountPayable: totals.amountPayable,
        paymentTerms: typeof body.paymentTerms === 'string' ? body.paymentTerms.trim() || null : null,
        purchaseOrderRef: typeof body.purchaseOrderRef === 'string' ? body.purchaseOrderRef.trim() || null : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
        items: { create: totals.items.map(({ discountAmount: _discountAmount, ...item }) => item) },
      },
      include: { organization: true, client: true, case: { select: { reference: true } }, payments: true, items: true },
    })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'create', entityType: 'invoice', entityId: invoice.id, details: { invoiceNumber, amountPayable: totals.amountPayable, vatRegime }, request })
    await notifyRoles({ organizationId: profile.organizationId, roles: ['COMPTABLE', 'COMMERCIAL'], title: profile.role === 'EXPLOITANT' ? 'Facture brouillon à valider' : 'Nouvelle facture', message: `${invoiceNumber} · ${Math.round(totals.amountPayable).toLocaleString('fr-FR')} GNF`, category: 'facture', link: '/facturation', excludeProfileId: profile.id })
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    const message = error instanceof Error && error.message.includes('Unique constraint') ? 'Le numéro de facture existe déjà. Réessayez.' : error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
