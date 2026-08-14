import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authorizeApi } from '@/lib/rbac/server'

export const dynamic = 'force-dynamic'

type Card = { label: string; value: number; kind?: 'money'; view: string; params?: Record<string, string>; tone?: 'danger' | 'warning' | 'success' }

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi('read', 'dashboard_role')
    if (!auth.allowed) return auth.response
    const { profile } = auth
    const requested = request.nextUrl.searchParams.get('space')?.toUpperCase()
    const role = profile.role === 'ADMIN' && ['COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'].includes(requested || '') ? requested : profile.role
    const organizationId = profile.organizationId

    if (role === 'COMMERCIAL') {
      const ownCaseWhere: Prisma.CaseWhereInput = { organizationId, commercialId: profile.id, status: { not: 'annule' } }
      const ownCount = await db.case.count({ where: ownCaseWhere })
      const fallback = ownCount === 0
      const caseWhere: Prisma.CaseWhereInput = fallback ? { organizationId, serviceChef: { site: profile.site }, status: { not: 'annule' } } : ownCaseWhere
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const quoteWhere: Prisma.QuotationWhereInput = { organizationId, ...(profile.role === 'ADMIN' ? {} : { commercialId: profile.id }) }
      const [quoteGroups, createdCases, signed, unpaid, reminders] = await Promise.all([
        db.quotation.groupBy({ by: ['status'], where: quoteWhere, _count: { _all: true } }),
        db.case.count({ where: { ...caseWhere, createdAt: { gte: monthStart } } }),
        db.quotation.aggregate({ where: { ...quoteWhere, status: 'accepte' }, _sum: { totalAmount: true } }),
        db.invoice.aggregate({ where: { organizationId, status: { in: ['emise', 'envoyee', 'partiellement_payee', 'echue'] }, ...(profile.role === 'ADMIN' ? {} : { OR: [{ case: { commercialId: profile.id } }, { client: { commercialOwnerId: profile.id } }] }) }, _sum: { amountPayable: true, paidAmount: true } }),
        db.invoice.count({ where: { organizationId, dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) }, status: { notIn: ['payee', 'annulee'] }, ...(profile.role === 'ADMIN' ? {} : { OR: [{ case: { commercialId: profile.id } }, { client: { commercialOwnerId: profile.id } }] }) } }),
      ])
      const pipeline = Object.fromEntries(quoteGroups.map((group) => [group.status, group._count._all]))
      const unpaidAmount = (unpaid._sum.amountPayable || 0) - (unpaid._sum.paidAmount || 0)
      const cards: Card[] = [
        { label: 'Devis en cours', value: (pipeline.brouillon || 0) + (pipeline.envoye || 0), view: 'quotes' },
        { label: 'Dossiers créés ce mois', value: createdCases, view: 'cases' },
        { label: 'CA signé', value: signed._sum.totalAmount || 0, kind: 'money', view: 'quotes', params: { status: 'accepte' }, tone: 'success' },
        { label: 'Factures non soldées', value: unpaidAmount, kind: 'money', view: 'invoices', tone: unpaidAmount > 0 ? 'warning' : 'success' },
        { label: 'Échéances à 7 jours', value: reminders, view: 'invoices', params: { scope: 'due_soon' }, tone: reminders ? 'warning' : 'success' },
      ]
      return NextResponse.json({ role, title: 'Pilotage commercial', subtitle: 'Pipeline, portefeuille et relances clients.', cards, fallback, pipeline })
    }

    if (role === 'EXPLOITANT') {
      const base = { organizationId, status: { notIn: ['cloture', 'annule'] } } satisfies Prisma.CaseWhereInput
      const [urgent, blocked, transit, customs, incidents, missingDocuments, declarationsDue] = await Promise.all([
        db.case.count({ where: { ...base, priority: { in: ['urgente', 'critique'] } } }),
        db.case.count({ where: { ...base, status: 'suspendu' } }),
        db.case.count({ where: { ...base, status: 'en_transit' } }),
        db.case.count({ where: { ...base, status: 'en_dedouanement' } }),
        db.incident.count({ where: { organizationId, status: { in: ['ouvert', 'en_cours'] } } }),
        db.case.count({ where: { ...base, documents: { none: { category: { in: ['bl', 'awb', 'declaration', 'bae', 'besc'] } } } } }),
        db.case.count({ where: { ...base, eta: { lte: new Date(Date.now() + 3 * 86400000) }, customsDeclarations: { none: { submittedAt: { not: null } } } } }),
      ])
      const cards: Card[] = [
        { label: 'Dossiers urgents', value: urgent, view: 'cases', params: { scope: 'urgent' }, tone: urgent ? 'danger' : 'success' },
        { label: 'Dossiers bloqués', value: blocked, view: 'cases', params: { scope: 'blocked' }, tone: blocked ? 'danger' : 'success' },
        { label: 'En transit', value: transit, view: 'cases', params: { status: 'en_transit' } },
        { label: 'En dédouanement', value: customs, view: 'douane' },
        { label: 'Documents à compléter', value: missingDocuments, view: 'documents', tone: missingDocuments ? 'warning' : 'success' },
        { label: 'Déclarations < 3 jours', value: declarationsDue, view: 'douane', tone: declarationsDue ? 'danger' : 'success' },
        { label: 'Incidents ouverts', value: incidents, view: 'incidents', tone: incidents ? 'danger' : 'success' },
      ]
      return NextResponse.json({ role, title: 'Tour de contrôle exploitation', subtitle: 'Priorités terrain, documents et circuit douane Guinée.', cards, fallback: false })
    }

    if (role === 'COMPTABLE') {
      const now = new Date()
      const [expenses, overdue, invoices, payments, vat] = await Promise.all([
        db.expenseRequest.aggregate({ where: { organizationId, status: { in: ['soumis', 'en_validation'] } }, _count: { _all: true }, _sum: { amountGnf: true, amount: true } }),
        db.invoice.aggregate({ where: { organizationId, dueDate: { lt: now }, status: { notIn: ['payee', 'annulee'] } }, _count: { _all: true }, _sum: { amountPayable: true, paidAmount: true } }),
        db.invoice.aggregate({ where: { organizationId, status: { not: 'annulee' } }, _sum: { amountPayable: true, paidAmount: true } }),
        db.payment.groupBy({ by: ['method'], where: { organizationId, status: 'confirme' }, _sum: { amount: true } }),
        db.invoice.aggregate({ where: { organizationId, status: { not: 'annulee' } }, _sum: { taxAmount: true } }),
      ])
      const outstanding = (invoices._sum.amountPayable || 0) - (invoices._sum.paidAmount || 0)
      const overdueAmount = (overdue._sum.amountPayable || 0) - (overdue._sum.paidAmount || 0)
      const cards: Card[] = [
        { label: `Débours à valider (${expenses._count._all})`, value: expenses._sum.amountGnf || expenses._sum.amount || 0, kind: 'money', view: 'expenses', tone: expenses._count._all ? 'warning' : 'success' },
        { label: `Factures échues (${overdue._count._all})`, value: overdueAmount, kind: 'money', view: 'invoices', tone: overdue._count._all ? 'danger' : 'success' },
        { label: 'Impayés', value: outstanding, kind: 'money', view: 'invoices', tone: outstanding ? 'warning' : 'success' },
        { label: 'CA encaissé', value: invoices._sum.paidAmount || 0, kind: 'money', view: 'payments', tone: 'success' },
        { label: 'TVA collectée', value: vat._sum.taxAmount || 0, kind: 'money', view: 'reports' },
      ]
      return NextResponse.json({ role, title: 'Finance & recouvrement', subtitle: 'Débours, encaissements, TVA et impayés en GNF.', cards, paymentBreakdown: payments, fallback: false })
    }

    return NextResponse.json({ error: 'Espace métier indisponible' }, { status: 403 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
