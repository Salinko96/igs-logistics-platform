import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSaaSState } from '@/lib/saas/usage'
import { stripeConfigured } from '@/lib/saas/stripe'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  try {
    const { subscription, usage } = await getSaaSState(profile.organizationId)
    const plans = await db.saaSPlan.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } })
    const payments = await db.saaSSubscriptionPayment.findMany({ where: { organizationId: profile.organizationId }, orderBy: { createdAt: 'desc' }, take: 20 })
    return NextResponse.json({
      subscription: { ...subscription, plan: { ...subscription.plan, maxStorageBytes: subscription.plan.maxStorageBytes?.toString() ?? null } },
      plans: plans.map((plan) => ({ ...plan, maxStorageBytes: plan.maxStorageBytes?.toString() ?? null })),
      usage,
      payments,
      providers: { stripe: stripeConfigured(), orangeMoney: Boolean(process.env.ORANGE_MONEY_MERCHANT_KEY) },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Abonnement indisponible' }, { status: 500 })
  }
}
