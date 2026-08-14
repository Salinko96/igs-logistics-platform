export type PaymentProvider = 'manuel' | 'stripe' | 'orange_money' | 'mtn_money' | 'chap_chap' | 'wise'

export function isPaymentProvider(value: string): value is PaymentProvider {
  return ['manuel', 'stripe', 'orange_money', 'mtn_money', 'chap_chap', 'wise'].includes(value)
}

export function isPaymentWebhookConfigured() {
  return Boolean(process.env.PAYMENT_WEBHOOK_SECRET)
}
