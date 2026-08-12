import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { getSessionProfile } from '@/lib/auth'
import { SECTION_VIEWS } from '@/lib/navigation'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isLegalOrganizationComplete } from '@/lib/organization'

export const dynamic = 'force-dynamic'

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const initialView = SECTION_VIEWS[section]
  if (!initialView) notFound()

  const { profile } = await getSessionProfile()
  if (initialView === 'subscription' && profile?.role !== 'ADMIN') redirect('/unauthorized')
  if (profile?.role === 'ADMIN') {
    const organization = await db.organization.findUnique({ where: { id: profile.organizationId } })
    if (organization && !isLegalOrganizationComplete(organization)) redirect('/onboarding')
  }
  return <AppShell initialProfile={profile} initialView={initialView} />
}
