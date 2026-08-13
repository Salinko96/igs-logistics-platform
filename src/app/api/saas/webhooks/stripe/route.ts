import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/saas/stripe'
import { isBillingCycle, isSaaSPlanCode } from '@/lib/saas/plans'
import { sendTransactionalEmail, subscriptionEmail } from '@/lib/saas/email'

export const dynamic = 'force-dynamic'

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    start: item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
    end: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId
  const planCode = subscription.metadata.planCode
  const billingCycle = subscription.metadata.billingCycle
  if (!organizationId || !isSaaSPlanCode(planCode) || !isBillingCycle(billingCycle)) return
  const plan = await db.saaSPlan.findUnique({ where: { code: planCode } })
  if (!plan) return
  const period = subscriptionPeriod(subscription)
  const status = subscription.status === 'canceled' ? 'canceled' : subscription.status
  const updated = await db.saaSSubscription.update({
    where: { organizationId },
    data: {
      planId: plan.id,
      status,
      billingCycle,
      provider: 'stripe',
      providerCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      providerSubscriptionId: subscription.id,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  })
  const admin = await db.profile.findFirst({ where: { organizationId, role: 'ADMIN', isActive: true }, select: { email: true } })
  if (admin?.email) sendTransactionalEmail({ to: admin.email, ...subscriptionEmail(plan.name, updated.status) }).catch(console.error)
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const raw = invoice as unknown as { subscription?: string | { id: string }; parent?: { subscription_details?: { subscription?: string | { id: string } } } }
  const subscription = raw.subscription ?? raw.parent?.subscription_details?.subscription
  return typeof subscription === 'string' ? subscription : subscription?.id
}

async function syncInvoice(invoice: Stripe.Invoice, status: 'paid' | 'failed') {
  const subscriptionId = invoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const subscription = await db.saaSSubscription.findUnique({ where: { providerSubscriptionId: subscriptionId } })
  if (!subscription) return
  const line = invoice.lines.data[0]
  await db.saaSSubscriptionPayment.upsert({
    where: { providerPaymentId: invoice.id },
    update: { status, paidAt: status === 'paid' ? new Date() : null, receiptUrl: invoice.hosted_invoice_url },
    create: {
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      provider: 'stripe',
      providerPaymentId: invoice.id,
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status,
      paidAt: status === 'paid' ? new Date() : null,
      receiptUrl: invoice.hosted_invoice_url,
      billingPeriodStart: line?.period?.start ? new Date(line.period.start * 1000) : null,
      billingPeriodEnd: line?.period?.end ? new Date(line.period.end * 1000) : null,
    },
  })
  await db.saaSSubscription.update({ where: { id: subscription.id }, data: { status: status === 'paid' ? 'active' : 'past_due' } })
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  try {
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (typeof session.subscription === 'string') await syncSubscription(await getStripe().subscriptions.retrieve(session.subscription))
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncSubscription(event.data.object)
    } else if (event.type === 'invoice.paid') {
      await syncInvoice(event.data.object, 'paid')
    } else if (event.type === 'invoice.payment_failed') {
      await syncInvoice(event.data.object, 'failed')
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Signature invalide' }, { status: 400 })
  }
}
