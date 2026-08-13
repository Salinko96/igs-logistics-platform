import { unstable_cache } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { latestDate, rollingTwelveMonthRange } from '@/lib/reporting'

const API_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

const getDashboardPayload = unstable_cache(
  async (organizationId: string, fromValue = '', toValue = '', period = '') => {
    const now = new Date()
    const parsedFrom = fromValue ? new Date(`${fromValue}T00:00:00.000Z`) : null
    const parsedTo = toValue ? new Date(`${toValue}T23:59:59.999Z`) : null
    let from = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : null
    let to = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : null
    const organization = await db.organization.findFirst({
      where: { id: organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return {
        totalCases: 0,
        activeCases: 0,
        blockedCases: 0,
        urgentCases: 0,
        casesByType: [],
        casesByStatus: [],
        expensesPending: 0,
        totalRevenue: 0,
        totalUnpaid: 0,
        invoicesOverdue: 0,
        incidentsOpen: 0,
        recentCases: [],
        recentIncidents: [],
        revenueByMonth: [],
        reportPeriod: null,
      }
    }
    if (period === 'rolling12') {
      const latestCase = await db.case.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
      const latestInvoice = await db.invoice.findFirst({ where: { organizationId: organization.id, issuedAt: { not: null } }, orderBy: { issuedAt: 'desc' }, select: { issuedAt: true } })
      const latestIncident = await db.incident.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
      const rolling = rollingTwelveMonthRange(latestDate([latestCase?.createdAt, latestInvoice?.issuedAt, latestIncident?.createdAt], now))
      from = rolling.from
      to = rolling.to
    }
    const firstMonth = from ?? new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const lastMonth = to ?? now
    const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined
    // Supabase's transaction pool is configured with connection_limit=1.
    // Keep these reads sequential so one dashboard request cannot exhaust it.
    const cases = await db.case.findMany({
        where: { organizationId: organization.id, status: { not: 'annule' }, ...(createdAt ? { createdAt } : {}) },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          reference: true,
          type: true,
          direction: true,
          status: true,
          priority: true,
          merchandise: true,
          eta: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { name: true } },
          serviceChef: { select: { firstName: true, lastName: true } },
        },
      })
    const expensesForCounters = await db.expenseRequest.findMany({
        where: { organizationId: organization.id, status: { in: ['en_validation', 'approuve', 'soumis'] }, ...(createdAt ? { createdAt } : {}) },
        select: { id: true },
      })
    const invoicesForCounters = await db.invoice.findMany({
        where: { organizationId: organization.id, status: { not: 'annulee' }, ...(from || to ? { issuedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
        select: { status: true, netAmount: true, paidAmount: true, issuedAt: true },
      })
    const incidents = await db.incident.findMany({
        where: { organizationId: organization.id, ...(createdAt ? { createdAt } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          createdAt: true,
          case: {
            select: {
              id: true,
              reference: true,
              client: { select: { name: true } },
            },
          },
        },
      })
    const recentRevenueInvoices = invoicesForCounters.filter(
      (invoice) =>
        !['annulee', 'brouillon'].includes(invoice.status) &&
        Boolean(invoice.issuedAt && invoice.issuedAt >= firstMonth),
    )

    const activeCases = cases.filter(
      (c) => !['cloture', 'annule', 'brouillon'].includes(c.status),
    ).length
    const blockedCases = cases.filter((c) => c.status === 'suspendu').length
    const urgentCases = cases.filter(
      (c) =>
        ['urgente', 'critique'].includes(c.priority) &&
        !['cloture', 'annule'].includes(c.status),
    ).length
    const casesByTypeMap = new Map<string, number>()
    const casesByStatusMap = new Map<string, number>()
    cases.forEach((c) => {
      casesByTypeMap.set(c.type, (casesByTypeMap.get(c.type) ?? 0) + 1)
      casesByStatusMap.set(c.status, (casesByStatusMap.get(c.status) ?? 0) + 1)
    })
    const billableInvoices = invoicesForCounters.filter(
      (invoice) => !['annulee', 'brouillon'].includes(invoice.status),
    )
    const unpaidInvoices = invoicesForCounters.filter((invoice) =>
      ['echue', 'envoyee', 'emise', 'partiellement_payee'].includes(invoice.status),
    )
    const totalUnpaid = unpaidInvoices.reduce(
      (sum, inv) => sum + (inv.netAmount - inv.paidAmount),
      0
    )
    const totalRevenue = billableInvoices.reduce(
      (sum, invoice) => sum + invoice.netAmount,
      0,
    )
    const invoicesOverdue = invoicesForCounters.filter(
      (invoice) => invoice.status === 'echue',
    ).length
    const incidentsOpen = incidents.filter((incident) =>
      ['ouvert', 'en_cours'].includes(incident.status),
    ).length
    const recentCases = cases.slice(0, 8)
    const recentIncidents = incidents.slice(0, 5)

    const revenueByMonth: { month: string; revenue: number }[] = []
    const monthCount = Math.min(24, Math.max(1, (lastMonth.getUTCFullYear() - firstMonth.getUTCFullYear()) * 12 + lastMonth.getUTCMonth() - firstMonth.getUTCMonth() + 1))
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1))
      const monthKey = d.toISOString().slice(0, 7)
      const revenue = recentRevenueInvoices.reduce((sum, invoice) => {
        if (!invoice.issuedAt) return sum
        return invoice.issuedAt.toISOString().startsWith(monthKey)
          ? sum + invoice.netAmount
          : sum
      }, 0)
      revenueByMonth.push({
        month: monthKey,
        revenue,
      })
    }

    return {
      totalCases: cases.length,
      activeCases,
      blockedCases,
      urgentCases,
      casesByType: Array.from(casesByTypeMap, ([type, count]) => ({
        type,
        count,
      })),
      casesByStatus: Array.from(casesByStatusMap, ([status, count]) => ({
        status,
        count,
      })),
      expensesPending: expensesForCounters.length,
      totalRevenue,
      totalUnpaid,
      invoicesOverdue,
      incidentsOpen,
      recentCases: recentCases.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        eta: c.eta?.toISOString() ?? null,
      })),
      recentIncidents: recentIncidents.map((inc) => ({
        id: inc.id,
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        createdAt: inc.createdAt.toISOString(),
        case: inc.case
          ? {
              id: inc.case.id,
              reference: inc.case.reference,
              client: { name: inc.case.client?.name ?? '—' },
            }
          : null,
      })),
      revenueByMonth,
      reportPeriod: from && to ? { from: from.toISOString(), to: to.toISOString(), mode: period === 'rolling12' ? 'rolling12' : 'custom' } : null,
    }
  },
  ['igs-dashboard-v4'],
  { revalidate: 60 },
)

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const from = request.nextUrl.searchParams.get('from') || ''
    const to = request.nextUrl.searchParams.get('to') || ''
    const period = request.nextUrl.searchParams.get('period') || ''
    const payload = await getDashboardPayload(profile.organizationId, from, to, period)
    return NextResponse.json(payload, { headers: API_CACHE_HEADERS })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
