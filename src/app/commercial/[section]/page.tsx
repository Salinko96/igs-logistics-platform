import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
import { COMMERCIAL_VIEWS } from '@/lib/rbac/workspaces'
export const dynamic = 'force-dynamic'
export default async function CommercialSection({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; const view = COMMERCIAL_VIEWS[section]; if (!view) notFound(); const { profile } = await requireWorkspaceRole('COMMERCIAL', 'ADMIN'); return <AppShell initialProfile={profile} initialView={view} /> }
