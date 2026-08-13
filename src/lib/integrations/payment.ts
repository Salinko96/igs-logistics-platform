export type PaymentProvider = 'manuel' | 'stripe' | 'orange_money' | 'mtn_money' | 'wise'

export function isPaymentProvider(value: string): value is PaymentProvider {
  return ['manuel', 'stripe', 'orange_money', 'mtn_money', 'wise'].includes(value)
}

export function isPaymentWebhookConfigured() {
  return Boolean(process.env.PAYMENT_WEBHOOK_SECRET)
}
