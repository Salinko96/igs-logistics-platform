import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

type AuditInput = {
  organizationId: string
  profileId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown> | string | null
  request?: NextRequest
}

export async function logAudit(input: AuditInput) {
  try {
    return await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        profileId: input.profileId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        details: typeof input.details === 'string' ? input.details : input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? input.request?.headers.get('x-real-ip') ?? null,
        userAgent: input.request?.headers.get('user-agent') ?? null,
      },
    })
  } catch (error) {
    console.error('Audit log failed:', error)
    return null
  }
}
