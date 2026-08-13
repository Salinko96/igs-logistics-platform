import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { AppShell } from '@/components/layout/app-shell'

export default async function DashboardPage() {
  const { profile } = await getSessionProfile()

  return <AppShell initialProfile={profile} />
}
