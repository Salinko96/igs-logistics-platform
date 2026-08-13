import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json([])
    }

    const whereClause: Record<string, unknown> = {
      isActive: true,
      organizationId: organization.id,
    }

    if (profile.role === 'CLIENT') {
      if (!profile.clientId) {
        return NextResponse.json([])
      }
      whereClause.id = profile.clientId
    }

    const clients = await db.client.findMany({
      where: whereClause,
      include: { contacts: true, _count: { select: { cases: true, invoices: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clients, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du client est obligatoire' },
        { status: 400 },
      )
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Aucune organisation active trouvée' },
        { status: 400 },
      )
    }

    const contactFirstName =
      typeof body.contactFirstName === 'string'
        ? body.contactFirstName.trim()
        : ''
    const contactLastName =
      typeof body.contactLastName === 'string' ? body.contactLastName.trim() : ''

    const client = await db.client.create({
      data: {
        organizationId: organization.id,
        name,
        type:
          typeof body.type === 'string' && body.type.trim()
            ? body.type.trim()
            : 'entreprise',
        sector:
          typeof body.sector === 'string' && body.sector.trim()
            ? body.sector.trim()
            : null,
        segment:
          typeof body.segment === 'string' && body.segment.trim()
            ? body.segment.trim()
            : 'Standard',
        taxId:
          typeof body.taxId === 'string' && body.taxId.trim()
            ? body.taxId.trim()
            : null,
        address:
          typeof body.address === 'string' && body.address.trim()
            ? body.address.trim()
            : null,
        city:
          typeof body.city === 'string' && body.city.trim()
            ? body.city.trim()
            : 'Conakry',
        country:
          typeof body.country === 'string' && body.country.trim()
            ? body.country.trim()
            : 'Guinée',
        phone:
          typeof body.phone === 'string' && body.phone.trim()
            ? body.phone.trim()
            : null,
        email:
          typeof body.email === 'string' && body.email.trim()
            ? body.email.trim().toLowerCase()
            : null,
        notes:
          typeof body.notes === 'string' && body.notes.trim()
            ? body.notes.trim()
            : null,
        contacts:
          contactFirstName || contactLastName
            ? {
                create: {
                  firstName: contactFirstName || 'Contact',
                  lastName: contactLastName || name,
                  position:
                    typeof body.contactPosition === 'string' &&
                    body.contactPosition.trim()
                      ? body.contactPosition.trim()
                      : null,
                  email:
                    typeof body.contactEmail === 'string' &&
                    body.contactEmail.trim()
                      ? body.contactEmail.trim().toLowerCase()
                      : null,
                  phone:
                    typeof body.contactPhone === 'string' &&
                    body.contactPhone.trim()
                      ? body.contactPhone.trim()
                      : null,
                  isPrimary: true,
                },
              }
            : undefined,
      },
      include: { contacts: true },
    })

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'create', entityType: 'client', entityId: client.id, details: { name: client.name }, request })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
