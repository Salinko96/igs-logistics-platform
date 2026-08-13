import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isLegalOrganizationComplete } from '@/lib/organization'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Enforce ADMIN or AGENT role server-side
  const { profile } = await requireRole('ADMIN', 'AGENT')
  if (profile?.role === 'ADMIN') {
    const organization = await db.organization.findUnique({ where: { id: profile.organizationId } })
    if (organization && !isLegalOrganizationComplete(organization)) redirect('/onboarding')
  }

  return <>{children}</>
}
