import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = Buffer.from(signature, 'utf8')
  const computed = Buffer.from(expected, 'utf8')
  return received.length === computed.length && timingSafeEqual(received, computed)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!validSignature(rawBody, request.headers.get('x-payment-signature'))) return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  try {
    const body = JSON.parse(rawBody) as { provider?: string; providerPaymentId?: string; status?: string; reference?: string }
    if (!body.providerPaymentId || !body.status) return NextResponse.json({ error: 'Événement incomplet' }, { status: 400 })
    const payment = await db.payment.findFirst({ where: { providerPaymentId: body.providerPaymentId }, select: { id: true, status: true, amount: true, invoiceId: true, organizationId: true } })
    if (!payment) return NextResponse.json({ received: true })
    if (payment.status === 'confirme' || body.status !== 'confirme') return NextResponse.json({ received: true })
    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId }, select: { totalAmount: true, paidAmount: true } })
      if (!invoice) throw new Error('Facture introuvable')
      const nextPaid = invoice.paidAmount + payment.amount
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'confirme', confirmedAt: new Date(), reference: body.reference ?? undefined } })
      await tx.invoice.update({ where: { id: payment.invoiceId }, data: { paidAmount: { increment: payment.amount }, status: nextPaid >= invoice.totalAmount ? 'payee' : 'partiellement_payee' } })
    })
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  }
}
