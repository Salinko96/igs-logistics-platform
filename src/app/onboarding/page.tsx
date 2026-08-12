import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { isLegalOrganizationComplete } from '@/lib/organization'
import { OrganizationOnboarding } from '@/components/onboarding/organization-onboarding'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { profile } = await requireRole('ADMIN')
  if (!profile) redirect('/unauthorized')
  const organization = await db.organization.findUnique({ where: { id: profile.organizationId } })
  if (!organization) redirect('/unauthorized')
  if (isLegalOrganizationComplete(organization)) redirect('/dashboard')
  return <OrganizationOnboarding organization={organization} />
}
