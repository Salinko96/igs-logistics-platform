import { db } from '@/lib/db'

export type QuotaResource = 'cases' | 'users' | 'storage'

export class QuotaExceededError extends Error {
  status = 402
  constructor(
    message: string,
    public resource: QuotaResource,
    public limit: number,
    public used: number,
  ) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

function monthBounds(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  }
}

export async function getSaaSState(organizationId: string) {
  const subscription = await db.saaSSubscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  })
  if (!subscription) throw new Error('Abonnement plateforme non configuré')

  const { start, end } = monthBounds()
  const cases = await db.case.count({ where: { organizationId, createdAt: { gte: start, lt: end } } })
  const users = await db.profile.count({ where: { organizationId, isActive: true } })
  const storage = await db.document.aggregate({ where: { organizationId }, _sum: { fileSize: true } })

  return {
    subscription,
    usage: {
      cases,
      users,
      storageBytes: storage._sum.fileSize ?? 0,
      periodStart: start,
      periodEnd: end,
    },
  }
}

export async function assertSaaSQuota(organizationId: string, resource: QuotaResource, increment = 1) {
  const { subscription, usage } = await getSaaSState(organizationId)
  const now = new Date()
  const expired = subscription.currentPeriodEnd && subscription.currentPeriodEnd < now
  const enabled = ['active', 'trialing'].includes(subscription.status) && !expired
  if (!enabled) {
    throw new QuotaExceededError('Votre abonnement plateforme doit être régularisé avant de continuer.', resource, 0, 0)
  }

  const limits = {
    cases: subscription.plan.maxCasesPerMonth,
    users: subscription.plan.maxUsers,
    storage: subscription.plan.maxStorageBytes === null ? null : Number(subscription.plan.maxStorageBytes),
  }
  const used = {
    cases: usage.cases,
    users: usage.users,
    storage: usage.storageBytes,
  }
  const limit = limits[resource]
  if (limit !== null && used[resource] + increment > limit) {
    const labels = { cases: 'dossiers mensuels', users: 'utilisateurs actifs', storage: 'stockage documentaire' }
    throw new QuotaExceededError(
      `Limite de ${labels[resource]} atteinte pour le plan ${subscription.plan.name}. Passez au plan supérieur depuis Abonnement plateforme.`,
      resource,
      limit,
      used[resource],
    )
  }
  return { subscription, usage }
}

export function quotaErrorResponse(error: unknown) {
  if (!(error instanceof QuotaExceededError)) return null
  return {
    error: error.message,
    code: 'SAAS_QUOTA_EXCEEDED',
    resource: error.resource,
    limit: error.limit,
    used: error.used,
    upgradeUrl: '/abonnement',
  }
}
