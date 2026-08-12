import { requireRole } from '@/lib/auth'

export default async function PortailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Enforce CLIENT role server-side
  await requireRole('CLIENT')

  return <>{children}</>
}
