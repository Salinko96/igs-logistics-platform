import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { isPaymentProvider } from '@/lib/integrations/payment'
import { logAudit } from '@/lib/audit'
import { authorizeApi } from '@/lib/rbac/server'
import { notifyRoles } from '@/lib/workflow-notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi('read', 'encaissements'); if (!auth.allowed) return auth.response
    const { profile } = auth
    const invoiceId = request.nextUrl.searchParams.get('invoiceId')
    const payments = await db.payment.findMany({ where: { organizationId: profile.organizationId, ...(invoiceId ? { invoiceId } : {}) }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi('create', 'encaissements'); if (!auth.allowed) return auth.response
    const { profile } = auth
    const body = await request.json().catch(() => ({}))
    const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId.trim() : ''
    const amount = Number(body.amount)
    if (!invoiceId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Facture et montant requis' }, { status: 400 })
    const invoice = await db.invoice.findFirst({ where: { id: invoiceId, organizationId: profile.organizationId }, select: { id: true, clientId: true, amountPayable: true, netAmount: true, paidAmount: true, currency: true, status: true } })
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (invoice.status === 'annulee') return NextResponse.json({ error: 'Une facture annulée ne peut pas être encaissée' }, { status: 400 })
    const payable = invoice.amountPayable > 0 ? invoice.amountPayable : invoice.netAmount
    if (amount > payable - invoice.paidAmount + 0.01) return NextResponse.json({ error: 'Le paiement dépasse le solde net à payer' }, { status: 400 })
    const provider = typeof body.provider === 'string' && isPaymentProvider(body.provider) ? body.provider : 'manuel'
    const mobile = ['orange_money', 'mtn_money', 'chap_chap'].includes(provider)
    const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
    const mobileNumber = typeof body.mobileNumber === 'string' ? body.mobileNumber.replace(/[\s-]/g, '') : ''
    const receiptUrl = typeof body.receiptUrl === 'string' ? body.receiptUrl.trim() : ''
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date()
    if (!reference || Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: 'Référence et date de paiement obligatoires' }, { status: 400 })
    if (mobile && (!/^\+?224(620|622|655)\d{6}$/.test(mobileNumber) || !receiptUrl)) return NextResponse.json({ error: 'Mobile money : numéro +224 valide et justificatif obligatoires' }, { status: 400 })
    const manuallyConfirmed = provider !== 'stripe'
    const payment = await db.payment.create({ data: { organizationId: profile.organizationId, invoiceId, clientId: invoice.clientId, amount, currency: typeof body.currency === 'string' ? body.currency : invoice.currency, method: typeof body.method === 'string' ? body.method : null, provider, providerPaymentId: typeof body.providerPaymentId === 'string' ? body.providerPaymentId : null, reference, mobileNumber: mobileNumber || null, operator: mobile ? provider : null, paidAt, receiptUrl: receiptUrl || null, notes: typeof body.notes === 'string' ? body.notes : null, status: manuallyConfirmed ? 'confirme' : 'en_attente', ...(manuallyConfirmed ? { confirmedById: profile.id, confirmedAt: new Date() } : {}) } })
    if (payment.status === 'confirme') await db.invoice.update({ where: { id: invoiceId }, data: { paidAmount: { increment: amount }, status: invoice.paidAmount + amount >= payable - 0.01 ? 'payee' : 'partiellement_payee' } })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'create', entityType: 'payment', entityId: payment.id, details: { amount, provider }, request })
    await notifyRoles({ organizationId: profile.organizationId, roles: ['COMMERCIAL', 'EXPLOITANT'], title: 'Encaissement enregistré', message: `${Math.round(amount).toLocaleString('fr-FR')} GNF · ${reference}`, category: 'paiement', link: '/facturation', excludeProfileId: profile.id })
    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
