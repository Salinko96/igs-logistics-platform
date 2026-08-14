import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function runtimeDatabaseUrl(value = process.env.DATABASE_URL) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.port === '6543' || url.searchParams.get('pgbouncer') === 'true') {
      const configuredLimit = Math.min(10, Math.max(1, Number(process.env.PRISMA_CONNECTION_LIMIT) || 3))
      url.searchParams.set('connection_limit', String(configuredLimit))
      url.searchParams.set('pool_timeout', '20')
    }
    return url.toString()
  } catch {
    return value
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: runtimeDatabaseUrl(),
    log: process.env.PRISMA_QUERY_LOG === 'true' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
