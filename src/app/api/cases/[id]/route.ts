import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { normalizeCaseStatus } from '@/lib/constants'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 404 })
    }

    const caseData = await db.case.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        client: { include: { contacts: true } },
        serviceChef: true,
        commercial: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        milestones: { orderBy: { plannedDate: 'asc' } },
        checklists: { orderBy: { createdAt: 'asc' } },
        assignees: {
          include: {
            profile: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        shipments: { include: { containers: true } },
        flights: true,
        transportMissions: true,
        customsDeclarations: {
          include: {
            events: { orderBy: { performedAt: 'desc' } },
          },
        },
        expenseRequests: { orderBy: { createdAt: 'desc' }, include: { requester: { select: { firstName: true, lastName: true } } } },
        invoices: {
          include: { items: true, payments: true },
        },
        incidents: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      )
    }

    // Access check for clients
    if (profile.role === 'CLIENT' && caseData.clientId !== profile.clientId) {
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 }
      )
    }

    // Filter out internal comments and expense requests for clients
    if (profile.role === 'CLIENT') {
      caseData.comments = caseData.comments.filter(c => !c.isInternal)
      // @ts-ignore
      caseData.expenseRequests = []
    }

    // Enrichir statusHistory avec les profils (pas de relation directe dans le schéma)
    const profileIds = caseData.statusHistory
      .map((s) => s.profileId)
      .filter(Boolean)
    const uniqueProfileIds = [...new Set(profileIds)]

    const profiles =
      uniqueProfileIds.length > 0
        ? await db.profile.findMany({
            where: { id: { in: uniqueProfileIds }, organizationId: organization.id },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : []

    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    const serialized = {
      ...caseData,
      createdAt: caseData.createdAt.toISOString(),
      updatedAt: caseData.updatedAt.toISOString(),
      eta: caseData.eta?.toISOString() ?? null,
      etd: caseData.etd?.toISOString() ?? null,
      ata: caseData.ata?.toISOString() ?? null,
      closedAt: caseData.closedAt?.toISOString() ?? null,
      statusHistory: caseData.statusHistory.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        profile: profileMap.get(s.profileId) ?? null,
      })),
      milestones: caseData.milestones.map((m) => ({
        ...m,
        plannedDate: m.plannedDate?.toISOString() ?? null,
        actualDate: m.actualDate?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      checklists: caseData.checklists.map((c) => ({
        ...c,
        completedAt: c.completedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      assignees: caseData.assignees.map((a) => ({
        ...a,
        assignedAt: a.assignedAt.toISOString(),
      })),
      documents: caseData.documents.map((d) => ({
        ...d,
        expiresAt: d.expiresAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      comments: caseData.comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      shipments: caseData.shipments.map((s) => ({
        ...s,
        freeTimeEndsAt: s.freeTimeEndsAt?.toISOString() ?? null,
        containerReturnDeadline: s.containerReturnDeadline?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        containers: s.containers.map((ct) => ({
          ...ct,
          createdAt: ct.createdAt.toISOString(),
          updatedAt: ct.updatedAt.toISOString(),
        })),
      })),
      flights: caseData.flights.map((f) => ({
        ...f,
        departureTime: f.departureTime?.toISOString() ?? null,
        arrivalTime: f.arrivalTime?.toISOString() ?? null,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      transportMissions: caseData.transportMissions.map((t) => ({
        ...t,
        scheduledDate: t.scheduledDate?.toISOString() ?? null,
        completedDate: t.completedDate?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      customsDeclarations: caseData.customsDeclarations.map((cd) => ({
        ...cd,
        submittedAt: cd.submittedAt?.toISOString() ?? null,
        clearedAt: cd.clearedAt?.toISOString() ?? null,
        createdAt: cd.createdAt.toISOString(),
        updatedAt: cd.updatedAt.toISOString(),
        events: cd.events.map((e) => ({
          ...e,
          performedAt: e.performedAt.toISOString(),
        })),
      })),
      expenseRequests: caseData.expenseRequests.map((e) => ({
        ...e,
        approvedAt: e.approvedAt?.toISOString() ?? null,
        paidAt: e.paidAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      invoices: caseData.invoices.map((i) => ({
        ...i,
        issuedAt: i.issuedAt?.toISOString() ?? null,
        dueDate: i.dueDate?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        items: i.items.map((it) => ({
          ...it,
          createdAt: it.createdAt.toISOString(),
        })),
        payments: i.payments.map((p) => ({
          ...p,
          confirmedAt: p.confirmedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      })),
      incidents: caseData.incidents.map((i) => ({
        ...i,
        resolvedAt: i.resolvedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const { id } = await params
    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const status = typeof body.status === 'string' ? normalizeCaseStatus(body.status) : null
    const closedAt = body.closedAt ? new Date(body.closedAt) : new Date()

    if (!status) {
      return NextResponse.json({ error: 'Statut manquant' }, { status: 400 })
    }

    const existing = await db.case.findFirst({
      where: { id, organizationId: organization.id },
      select: { id: true, status: true, serviceChefId: true, declaredValue: true, incoterm: true, etd: true, eta: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    const postDraftStatuses = ['devis_en_preparation', 'devis_envoye', 'commande_confirme', 'dossier_ouvert', 'documents_en_attente', 'documents_conformes', 'en_preparation', 'en_transit', 'arrive_au_port', 'en_dedouanement', 'en_attente_paiement', 'mainlevee_obtenue', 'sortie_autorise', 'en_livraison', 'livre', 'facturation_en_cours', 'cloture']
    if (postDraftStatuses.includes(status)) {
      const missing = [!existing.declaredValue && 'Valeur marchandise', !existing.incoterm && 'Incoterm', !existing.etd && 'ETD', !existing.eta && 'ETA'].filter(Boolean)
      if (missing.length) return NextResponse.json({ error: `Dossier incomplet avant changement de statut : ${missing.join(', ')}` }, { status: 409 })
    }

    const updated = await db.case.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'cloture' ? closedAt : null,
      },
      select: {
        id: true,
        status: true,
        closedAt: true,
        updatedAt: true,
      },
    })

    await db.caseStatusHistory.create({
      data: {
        caseId: id,
        fromStatus: existing.status,
        toStatus: status,
        comment: status === 'cloture' ? 'Dossier clôturé manuellement' : 'Statut mis à jour',
        profileId: profile.id,
      },
    })

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'status_changed', entityType: 'case', entityId: id, details: { from: existing.status, to: status }, request })

    return NextResponse.json({
      ...updated,
      closedAt: updated.closedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
