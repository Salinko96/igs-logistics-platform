import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const ALLOWED_STATUSES = ['brouillon', 'emise', 'envoyee', 'annulee']

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await context.params
    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: profile.organizationId, ...(profile.role === 'CLIENT' ? { clientId: profile.clientId || '__none__' } : {}) },
      include: {
        organization: { select: { name: true, address: true, city: true, country: true, phone: true, email: true, taxId: true } },
        client: { select: { name: true, address: true, city: true, country: true, phone: true, email: true, taxId: true } },
        case: { select: { reference: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    return NextResponse.json(invoice, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || !['ADMIN', 'AGENT'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    const { id } = await context.params
    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status : ''
    if (!ALLOWED_STATUSES.includes(status)) return NextResponse.json({ error: 'Statut non autorisé' }, { status: 400 })
    const current = await db.invoice.findFirst({ where: { id, organizationId: profile.organizationId }, select: { id: true, status: true, paidAmount: true } })
    if (!current) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (status === 'annulee' && current.paidAmount > 0) return NextResponse.json({ error: 'Annulation impossible : un paiement est déjà enregistré' }, { status: 400 })
    const invoice = await db.invoice.update({ where: { id }, data: { status, ...(status !== 'brouillon' ? { issuedAt: new Date() } : {}) } })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'update', entityType: 'invoice', entityId: id, details: { previousStatus: current.status, status }, request })
    return NextResponse.json(invoice)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
