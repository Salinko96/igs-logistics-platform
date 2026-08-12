export const SAAS_PLAN_CODES = ['starter', 'business', 'enterprise'] as const
export type SaaSPlanCode = (typeof SAAS_PLAN_CODES)[number]
export type BillingCycle = 'monthly' | 'annual'

export function isSaaSPlanCode(value: string): value is SaaSPlanCode {
  return SAAS_PLAN_CODES.includes(value as SaaSPlanCode)
}

export function isBillingCycle(value: string): value is BillingCycle {
  return value === 'monthly' || value === 'annual'
}

export function stripePriceEnv(plan: SaaSPlanCode, cycle: BillingCycle) {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`
  return process.env[key]
}
