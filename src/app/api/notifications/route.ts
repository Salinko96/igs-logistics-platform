import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function extractCaseReferences(text: string) {
  return text.match(/IGS-\d{4}-[A-Z]{3}-\d{4}/g) ?? []
}

export async function GET() {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
    })

    if (!organization) {
      return NextResponse.json({ items: [], unreadCount: 0 })
    }

    const whereClause = {
      organizationId: organization.id,
      OR: [
        { profileId: profile.id },
        { profileId: null },
      ]
    }

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where: { ...whereClause, isRead: false } }),
    ])

    const references = [
      ...new Set(
        notifications.flatMap((notification) =>
          extractCaseReferences(`${notification.title} ${notification.message}`),
        ),
      ),
    ]
    const cases =
      references.length > 0
        ? await db.case.findMany({
            where: { organizationId: organization.id, reference: { in: references } },
            select: { id: true, reference: true },
          })
        : []
    const caseByReference = new Map(cases.map((item) => [item.reference, item]))

    const items = notifications.map((notification) => {
      if (notification.link) return notification

      const reference = extractCaseReferences(
        `${notification.title} ${notification.message}`,
      ).find((item) => caseByReference.has(item))
      const linkedCase = reference ? caseByReference.get(reference) : null

      if (linkedCase) {
        return { ...notification, link: `/dossiers?case=${linkedCase.id}` }
      }

      if (notification.category === 'paiement') {
        return { ...notification, link: '/facturation' }
      }
      if (notification.category === 'document') {
        return { ...notification, link: '/documents' }
      }
      if (notification.category === 'incident') {
        return { ...notification, link: '/incidents' }
      }

      return notification
    })

    return NextResponse.json({ items, unreadCount })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : null
    const isRead = Boolean(body.isRead)

    if (!id) {
      return NextResponse.json({ error: 'Notification invalide' }, { status: 400 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 404 })
    }

    const updated = await db.notification.updateMany({
      where: { 
        id, 
        organizationId: organization.id,
        OR: [
          { profileId: profile.id },
          { profileId: null }
        ]
      },
      data: { isRead },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Notification introuvable' }, { status: 404 })
    }

    const unreadCount = organization
      ? await db.notification.count({
        where: { 
          organizationId: organization.id, 
          isRead: false,
          OR: [
            { profileId: profile.id },
            { profileId: null }
          ]
        },
        })
      : 0

    const item = await db.notification.findFirst({
      where: { id, organizationId: organization.id },
    })

    return NextResponse.json({ item, unreadCount })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
