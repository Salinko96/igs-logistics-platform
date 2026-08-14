import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export default async function SharedCasePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const { profile } = await requireWorkspaceRole('ADMIN', 'AGENT', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'); return <AppShell initialProfile={profile} initialView="case-detail" initialParams={{ id }} /> }
