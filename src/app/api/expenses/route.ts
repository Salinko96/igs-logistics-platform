import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { notifyRoles } from '@/lib/workflow-notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || !['ADMIN', 'AGENT', 'EXPLOITANT', 'COMPTABLE', 'COMMERCIAL'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json([])
    }

    const expenses = await db.expenseRequest.findMany({
      where: { organizationId: organization.id },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        case: { select: { reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(expenses, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || !['ADMIN', 'AGENT', 'EXPLOITANT', 'COMPTABLE'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const body = await request.json()
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
    if (!description || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Description et montant requis' }, { status: 400 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 400 })
    }

    const caseId = typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null
    if (caseId) {
      const caseRecord = await db.case.findFirst({
        where: { id: caseId, organizationId: organization.id },
        select: { id: true },
      })
      if (!caseRecord) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }
    }

    const expense = await db.expenseRequest.create({
      data: {
        organizationId: organization.id,
        caseId,
        requesterId: profile.id,
        amount,
        currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'GNF',
        amountGnf: amount,
        description,
        vendor: typeof body.vendor === 'string' && body.vendor.trim() ? body.vendor.trim() : null,
        vendorType: typeof body.vendorType === 'string' && body.vendorType.trim() ? body.vendorType.trim() : null,
        category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null,
        status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'cree',
      },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        case: { select: { reference: true } },
      },
    })

    await logAudit({
      organizationId: profile.organizationId,
      profileId: profile.id,
      action: 'create',
      entityType: 'expense',
      entityId: expense.id,
      details: { amount: expense.amount, currency: expense.currency, category: expense.category },
      request,
    })
    await notifyRoles({ organizationId: profile.organizationId, roles: ['COMPTABLE'], title: 'Débours à traiter', message: `${expense.description} · ${Math.round(expense.amount).toLocaleString('fr-FR')} GNF`, category: 'paiement', link: '/debours', excludeProfileId: profile.id })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || !['ADMIN', 'COMPTABLE'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''
    const status = body.status === 'approuve' ? 'approuve' : body.status === 'rejete' ? 'rejete' : null
    if (!id || !status) return NextResponse.json({ error: 'Débours et décision requis' }, { status: 400 })
    const expense = await db.expenseRequest.findFirst({ where: { id, organizationId: profile.organizationId } })
    if (!expense) return NextResponse.json({ error: 'Débours introuvable' }, { status: 404 })
    if (!['soumis', 'en_validation'].includes(expense.status)) return NextResponse.json({ error: 'Ce débours a déjà été traité' }, { status: 409 })
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : ''
    if (status === 'rejete' && !rejectionReason) return NextResponse.json({ error: 'Le motif de rejet est obligatoire' }, { status: 400 })
    const updated = await db.expenseRequest.update({ where: { id }, data: { status, approvedById: profile.id, approvedAt: new Date(), rejectionReason: status === 'rejete' ? rejectionReason : null } })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: status === 'approuve' ? 'expense_approved' : 'expense_rejected', entityType: 'expense', entityId: id, details: { amount: expense.amount, rejectionReason: rejectionReason || null }, request })
    return NextResponse.json(updated)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 }) }
}
