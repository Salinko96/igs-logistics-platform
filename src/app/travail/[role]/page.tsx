import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { requireWorkspaceRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'
const roles = { commercial: 'COMMERCIAL', exploitant: 'EXPLOITANT', comptable: 'COMPTABLE' } as const
export default async function WorkHome({ params }: { params: Promise<{ role: string }> }) { const { role } = await params; const requiredRole = roles[role as keyof typeof roles]; if (!requiredRole) notFound(); const { profile } = await requireWorkspaceRole(requiredRole, 'ADMIN'); return <AppShell initialProfile={profile} initialView="role-dashboard" /> }
