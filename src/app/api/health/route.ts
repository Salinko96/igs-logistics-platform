import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DATABASE_TIMEOUT_MS = 4_000

async function databaseIsReachable() {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database health check timed out')), DATABASE_TIMEOUT_MS)
  })

  await Promise.race([db.$queryRaw`SELECT 1`, timeout])
}

export async function GET() {
  const startedAt = performance.now()

  try {
    await databaseIsReachable()
    return NextResponse.json({
      status: 'ok',
      service: 'igs-logistics-platform',
      database: 'reachable',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      responseTimeMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({
      status: 'degraded',
      service: 'igs-logistics-platform',
      database: 'unreachable',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      responseTimeMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
