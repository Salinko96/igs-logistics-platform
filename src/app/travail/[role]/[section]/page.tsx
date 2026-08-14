import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
import { COMMERCIAL_VIEWS, EXPLOITANT_VIEWS, COMPTABLE_VIEWS } from '@/lib/rbac/workspaces'
export const dynamic = 'force-dynamic'
const config = { commercial: { role: 'COMMERCIAL', views: COMMERCIAL_VIEWS }, exploitant: { role: 'EXPLOITANT', views: EXPLOITANT_VIEWS }, comptable: { role: 'COMPTABLE', views: COMPTABLE_VIEWS } } as const
export default async function WorkSection({ params }: { params: Promise<{ role: string; section: string }> }) { const { role, section } = await params; const space = config[role as keyof typeof config]; if (!space) notFound(); const view = space.views[section as keyof typeof space.views]; if (!view) notFound(); const { profile } = await requireWorkspaceRole(space.role, 'ADMIN'); return <AppShell initialProfile={profile} initialView={view} /> }
