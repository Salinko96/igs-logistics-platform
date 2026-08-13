import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function PortailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Enforce CLIENT role server-side
  await requireRole('CLIENT')

  return <>{children}</>
}
