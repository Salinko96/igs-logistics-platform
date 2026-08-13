import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const RESULT_LIMIT = 5

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const query = request.nextUrl.searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ cases: [], clients: [], documents: [], invoices: [] })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json({ cases: [], clients: [], documents: [], invoices: [] })
    }

    const cases = await db.case.findMany({
        where: {
          organizationId: organization.id,
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { merchandise: { contains: query, mode: 'insensitive' } },
            { client: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          reference: true,
          status: true,
          type: true,
          client: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: RESULT_LIMIT,
      })
    const clients = await db.client.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            {
              contacts: {
                some: {
                  OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          sector: true,
          city: true,
          contacts: {
            where: { isPrimary: true },
            select: { firstName: true, lastName: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        take: RESULT_LIMIT,
      })
    const documents = await db.document.findMany({
        where: {
          organizationId: organization.id,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { case: { reference: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          category: true,
          case: { select: { id: true, reference: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: RESULT_LIMIT,
      })
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: organization.id,
        OR: [
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { case: { reference: { contains: query, mode: 'insensitive' } } },
          { purchaseOrderRef: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        client: { select: { name: true } },
        case: { select: { reference: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: RESULT_LIMIT,
    })

    return NextResponse.json({ cases, clients, documents, invoices })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
