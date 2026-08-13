import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export type DashboardPage = { page?: number; pageSize?: number }

const loadDashboard = unstable_cache(
  async (organizationId: string, page: number, pageSize: number) => {
    const skip = (page - 1) * pageSize
    const cases = await db.case.findMany({ where: { organizationId, status: { not: 'annule' } }, select: { id: true, status: true, priority: true } })
    const expenses = await db.expenseRequest.count({ where: { organizationId, status: { in: ['en_validation', 'approuve', 'soumis'] } } })
    const invoices = await db.invoice.findMany({ where: { organizationId, status: { not: 'annulee' } }, select: { status: true, netAmount: true, paidAmount: true, issuedAt: true } })
    const incidents = await db.incident.count({ where: { organizationId, status: { in: ['ouvert', 'en_cours'] } } })
    const shipments = await db.shipment.findMany({ where: { case: { organizationId } }, orderBy: { updatedAt: 'desc' }, skip, take: pageSize, select: { id: true, vesselName: true, voyageNumber: true, updatedAt: true, case: { select: { reference: true, client: { select: { name: true } } } } } })
    const shipmentsTotal = await db.shipment.count({ where: { case: { organizationId } } })
    const billable = invoices.filter((i) => !['annulee', 'brouillon'].includes(i.status))
    const unpaid = invoices.filter((i) => ['echue', 'envoyee', 'emise', 'partiellement_payee'].includes(i.status))
    const now = new Date()
    const revenueByMonth = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      const month = date.toISOString().slice(0, 7)
      return { month, revenue: invoices.filter((i) => i.issuedAt?.toISOString().startsWith(month)).reduce((sum, i) => sum + i.netAmount, 0) }
    })
    return {
      kpis: { totalCases: cases.length, activeCases: cases.filter((c) => !['cloture', 'annule', 'brouillon'].includes(c.status)).length, blockedCases: cases.filter((c) => c.status === 'suspendu').length, urgentCases: cases.filter((c) => ['urgente', 'critique'].includes(c.priority)).length, expensesPending: expenses, totalRevenue: billable.reduce((s, i) => s + i.netAmount, 0), totalUnpaid: unpaid.reduce((s, i) => s + i.netAmount - i.paidAmount, 0), invoicesOverdue: invoices.filter((i) => i.status === 'echue').length, incidentsOpen: incidents },
      revenueByMonth, shipments: shipments.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() })), shipmentsTotal,
    }
  },
  ['igs-dashboard-server-v1'], { revalidate: 60 },
)

export async function getDashboardData({ page = 1, pageSize = 10 }: DashboardPage = {}) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile) return null
  return loadDashboard(profile.organizationId, Math.max(1, page), Math.min(50, Math.max(1, pageSize)))
}
