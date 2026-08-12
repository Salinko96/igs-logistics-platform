import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    if (profile.role === 'CLIENT' && profile.clientId !== id) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    if (profile.role !== 'ADMIN' && profile.role !== 'AGENT' && profile.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const client = await db.client.findFirst({
      where: { id, organizationId: profile.organizationId },
      include: {
        contacts: true,
        cases: {
          orderBy: { updatedAt: 'desc' },
          take: 20,
          include: {
            serviceChef: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      ...client,
      cases: client.cases.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        eta: c.eta?.toISOString() ?? null,
        etd: c.etd?.toISOString() ?? null,
        ata: c.ata?.toISOString() ?? null,
      })),
      invoices: client.invoices.map((invoice) => ({
        ...invoice,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      })),
      contacts: client.contacts,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
