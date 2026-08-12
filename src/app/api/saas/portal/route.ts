import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/saas/stripe'

export async function POST(request: NextRequest) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  const subscription = await db.saaSSubscription.findUnique({ where: { organizationId: profile.organizationId } })
  if (!subscription?.providerCustomerId) return NextResponse.json({ error: 'Aucun compte de paiement en ligne actif' }, { status: 400 })
  try {
    const session = await getStripe().billingPortal.sessions.create({ customer: subscription.providerCustomerId, return_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/abonnement` })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Portail indisponible' }, { status: 500 })
  }
}
