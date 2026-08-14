import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
import { COMPTABLE_VIEWS } from '@/lib/rbac/workspaces'
export const dynamic = 'force-dynamic'
export default async function AccountantSection({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; const view = COMPTABLE_VIEWS[section]; if (!view) notFound(); const { profile } = await requireWorkspaceRole('COMPTABLE', 'ADMIN'); return <AppShell initialProfile={profile} initialView={view} /> }
