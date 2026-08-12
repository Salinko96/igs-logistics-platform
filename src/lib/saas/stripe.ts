import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Paiement par carte non configuré')
  stripe ??= new Stripe(key)
  return stripe
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}
