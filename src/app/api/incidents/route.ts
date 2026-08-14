import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getIncidentStatus } from '@/lib/constants'
import { compareIncidentPriority, incidentNeedsAttention } from '@/lib/incidents'
import { notifyRoles } from '@/lib/workflow-notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
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
      organizationId: organization.id,
    }

    if (profile.role === 'CLIENT') {
      if (!profile.clientId) {
        return NextResponse.json([])
      }
      whereClause.case = {
        clientId: profile.clientId,
      }
    }

    const incidents = await db.incident.findMany({
      where: whereClause,
      include: {
        case: {
          select: {
            reference: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const alertDelayDays = Math.max(1, Number(process.env.INCIDENT_STALE_ALERT_DAYS) || 3)
    return NextResponse.json(incidents.sort(compareIncidentPriority).map((incident) => ({ ...incident, needsAttention: incidentNeedsAttention(incident, new Date(), alertDelayDays), alertDelayDays })), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (!['ADMIN', 'AGENT', 'EXPLOITANT'].includes(profile.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    if (!title || !description || !type) {
      return NextResponse.json({ error: 'Titre, description et type requis' }, { status: 400 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 400 })
    }

    const caseId = typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null
    if (caseId) {
      const caseRecord = await db.case.findFirst({
        where: { id: caseId, organizationId: organization.id },
        select: { id: true, clientId: true },
      })
      if (!caseRecord) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }
      if (profile.role === 'CLIENT' && caseRecord.clientId !== profile.clientId) {
        return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
      }
    } else if (profile.role === 'CLIENT') {
      return NextResponse.json({ error: 'Un dossier est requis pour déclarer un incident' }, { status: 400 })
    }

    const incident = await db.incident.create({
      data: {
        organizationId: organization.id,
        caseId,
        title,
        description,
        type,
        severity: typeof body.severity === 'string' && body.severity.trim() ? body.severity.trim() : 'moyen',
        status: typeof body.status === 'string' ? getIncidentStatus(body.status)?.value ?? 'ouvert' : 'ouvert',
        resolution: typeof body.resolution === 'string' && body.resolution.trim() ? body.resolution.trim() : null,
      },
      include: {
        case: {
          select: {
            reference: true,
            client: { select: { name: true } },
          },
        },
      },
    })

    await logAudit({
      organizationId: profile.organizationId,
      profileId: profile.id,
      action: 'create',
      entityType: 'incident',
      entityId: incident.id,
      details: { type: incident.type, severity: incident.severity },
      request,
    })
    await notifyRoles({ organizationId: profile.organizationId, roles: ['COMPTABLE', 'COMMERCIAL'], title: `Incident ${incident.severity}`, message: `${incident.title}${incident.case?.reference ? ` · ${incident.case.reference}` : ''}`, category: 'incident', link: '/incidents', critical: incident.severity === 'critique', excludeProfileId: profile.id })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
