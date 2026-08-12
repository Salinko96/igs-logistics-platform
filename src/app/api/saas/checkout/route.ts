import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/saas/stripe'
import { isBillingCycle, isSaaSPlanCode, stripePriceEnv } from '@/lib/saas/plans'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  try {
    const body = await request.json()
    const planCode = typeof body.plan === 'string' ? body.plan : ''
    const cycle = typeof body.billingCycle === 'string' ? body.billingCycle : ''
    if (!isSaaSPlanCode(planCode) || !isBillingCycle(cycle)) return NextResponse.json({ error: 'Plan ou cycle invalide' }, { status: 400 })
    if (planCode === 'enterprise') return NextResponse.json({ contactUrl: `mailto:${process.env.SALES_EMAIL || 'contact@igsgf.com'}?subject=Offre Enterprise IGS Nexus` })

    const price = stripePriceEnv(planCode, cycle)
    if (!price) return NextResponse.json({ error: 'Le paiement en ligne de ce plan n’est pas encore configuré. Contactez le service commercial.' }, { status: 503 })
    const subscription = await db.saaSSubscription.findUnique({ where: { organizationId: profile.organizationId }, include: { organization: true } })
    if (!subscription) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: subscription.providerCustomerId || undefined,
      customer_email: subscription.providerCustomerId ? undefined : subscription.organization.email || profile.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/abonnement?checkout=success`,
      cancel_url: `${origin}/abonnement?checkout=canceled`,
      client_reference_id: subscription.organizationId,
      metadata: { organizationId: subscription.organizationId, planCode, billingCycle: cycle },
      subscription_data: { metadata: { organizationId: subscription.organizationId, planCode, billingCycle: cycle } },
      allow_promotion_codes: true,
    })
    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'subscription_checkout_started', entityType: 'saas_subscription', entityId: subscription.id, details: { planCode, cycle }, request })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Paiement indisponible' }, { status: 500 })
  }
}
