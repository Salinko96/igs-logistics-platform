import type { app_role } from '@prisma/client'
import { db } from '@/lib/db'

export async function notifyRoles(input: { organizationId: string; roles: app_role[]; title: string; message: string; category: string; link: string; critical?: boolean; excludeProfileId?: string }) {
  const roles = input.critical ? [...new Set([...input.roles, 'ADMIN' as app_role])] : input.roles.filter((role) => role !== 'ADMIN')
  const profiles = await db.profile.findMany({ where: { organizationId: input.organizationId, role: { in: roles }, approvalStatus: 'approved', isActive: true, ...(input.excludeProfileId ? { id: { not: input.excludeProfileId } } : {}) }, select: { id: true } })
  if (!profiles.length) return
  await db.notification.createMany({ data: profiles.map((profile) => ({ organizationId: input.organizationId, profileId: profile.id, title: input.title, message: input.message, category: input.category, type: input.critical ? 'alerte' : 'info', link: input.link })) })
}
