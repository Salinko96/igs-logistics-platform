import { createHash } from 'node:crypto'
import { db } from '@/lib/db'

const MAX_FAILURES = 5
const LOCK_MINUTES = 15
const WINDOW_MINUTES = 30

export function loginKey(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function maskEmail(email: string) {
  const [local, domain = ''] = email.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

export async function checkLoginAllowed(identifierHash: string) {
  const attempt = await db.loginAttempt.findUnique({ where: { identifierHash } })
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) return { allowed: false, lockedUntil: attempt.lockedUntil }
  return { allowed: true, lockedUntil: null }
}

export async function recordLoginFailure(input: { identifierHash: string; email: string; ipAddress: string; organizationId?: string | null }) {
  const existing = await db.loginAttempt.findUnique({ where: { identifierHash: input.identifierHash } })
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000)
  const failedCount = existing?.lastFailedAt && existing.lastFailedAt > windowStart ? existing.failedCount + 1 : 1
  const lockedUntil = failedCount >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
  await db.loginAttempt.upsert({
    where: { identifierHash: input.identifierHash },
    create: { identifierHash: input.identifierHash, emailMasked: maskEmail(input.email), failedCount, lockedUntil, lastFailedAt: new Date(), lastIpAddress: input.ipAddress, organizationId: input.organizationId || null },
    update: { failedCount, lockedUntil, lastFailedAt: new Date(), lastIpAddress: input.ipAddress, organizationId: input.organizationId || undefined },
  })
  return { failedCount, lockedUntil }
}

export async function clearLoginFailures(identifierHash: string) {
  await db.loginAttempt.deleteMany({ where: { identifierHash } })
}
