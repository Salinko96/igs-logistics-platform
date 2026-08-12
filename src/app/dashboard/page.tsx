import { getSessionProfile } from '@/lib/auth'
import { AppShell } from '@/components/layout/app-shell'

export default async function DashboardPage() {
  const { profile } = await getSessionProfile()

  return <AppShell initialProfile={profile} />
}
