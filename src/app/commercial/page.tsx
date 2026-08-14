import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export default async function CommercialPage() { const { profile } = await requireWorkspaceRole('COMMERCIAL', 'ADMIN'); return <AppShell initialProfile={profile} initialView="role-dashboard" /> }
