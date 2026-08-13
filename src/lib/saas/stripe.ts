import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Paiement par carte non configuré')
  stripe ??= new Stripe(key)
  return stripe
}

export function stripeConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    && process.env.STRIPE_SECRET_KEY
    && process.env.STRIPE_WEBHOOK_SECRET
    && process.env.STRIPE_PRICE_STARTER_MONTHLY
    && process.env.STRIPE_PRICE_STARTER_ANNUAL
    && process.env.STRIPE_PRICE_BUSINESS_MONTHLY
    && process.env.STRIPE_PRICE_BUSINESS_ANNUAL
  )
}
