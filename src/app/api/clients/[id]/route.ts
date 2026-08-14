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

    if (!['ADMIN', 'AGENT', 'CLIENT', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'].includes(profile.role)) {
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || !['ADMIN', 'COMMERCIAL'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  const { id } = await params; const body = await request.json().catch(() => ({}))
  const client = await db.client.findFirst({ where: { id, organizationId: profile.organizationId } })
  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
  const value = (key: string) => typeof body[key] === 'string' ? body[key].trim() || null : undefined
  if (body.phone && !/^\+224(?:[\s-]?\d){9}$/.test(body.phone)) return NextResponse.json({ error: 'Téléphone +224 invalide' }, { status: 400 })
  const updated = await db.client.update({ where: { id }, data: { name: value('name') || client.name, acronym: value('acronym'), taxId: value('taxId'), rccm: value('rccm'), phone: value('phone'), whatsapp: value('whatsapp'), email: value('email'), address: value('address'), commune: value('commune'), city: value('city') || client.city, sector: value('sector'), segment: value('segment'), paymentTerms: value('paymentTerms'), creditLimit: body.creditLimit == null ? undefined : Number(body.creditLimit), commercialOwnerId: profile.role === 'COMMERCIAL' ? profile.id : value('commercialOwnerId') } })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile || !['ADMIN', 'COMMERCIAL'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  const { id } = await params
  const updated = await db.client.updateMany({ where: { id, organizationId: profile.organizationId }, data: { isActive: false } })
  return updated.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
}
