import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const whereClause =
      profile.role === 'CLIENT'
        ? {
            case: {
              organizationId: profile.organizationId,
              ...(profile.clientId ? { clientId: profile.clientId } : { id: '__none__' }),
            },
          }
        : {
            case: { organizationId: profile.organizationId },
          }

    const shipments = await db.shipment.findMany({
      where: whereClause,
      include: {
        containers: true,
        case: {
          select: {
            id: true,
            reference: true,
            status: true,
            priority: true,
            eta: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(shipments, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
