import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
import { normalizeCaseStatus } from '@/lib/constants'
import { logAudit } from '@/lib/audit'
import { assertSaaSQuota, quotaErrorResponse } from '@/lib/saas/usage'
import { paginationMeta, parsePagination } from '@/lib/pagination'
import type { Prisma } from '@prisma/client'

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

    if (!organization) return NextResponse.json({ items: [], pagination: paginationMeta(0, 1, 20), summary: { active: 0, urgent: 0, blocked: 0 } })

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const scope = searchParams.get('scope')
    const search = searchParams.get('search')
    const compact = searchParams.get('compact') === 'true'
    const { page, pageSize, skip } = parsePagination(searchParams, compact ? 100 : 20)
    
    let clientId = searchParams.get('clientId')
    if (profile.role === 'CLIENT') {
      if (!profile.clientId) {
        return NextResponse.json({ items: [], pagination: paginationMeta(0, page, pageSize), summary: { active: 0, urgent: 0, blocked: 0 } })
      }
      clientId = profile.clientId
    }

    const where: Prisma.CaseWhereInput = {
      organizationId: organization.id,
      status: { not: 'annule' },
    }

    if (type) where.type = type
    if (scope === 'active') where.status = { notIn: ['cloture', 'annule', 'brouillon'] }
    if (scope === 'blocked') where.status = 'suspendu'
    if (scope === 'urgent') {
      where.priority = { in: ['urgente', 'critique'] }
      where.status = { notIn: ['cloture', 'annule'] }
    }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { description: { contains: search } },
        { merchandise: { contains: search } },
        { client: { name: { contains: search } } },
      ]
    }

    const sort = searchParams.get('sort')
    const direction = searchParams.get('direction') === 'asc' ? 'asc' : 'desc'
    const orderBy: Prisma.CaseOrderByWithRelationInput = sort === 'reference' ? { reference: direction } : sort === 'createdAt' ? { createdAt: direction } : { updatedAt: direction }
    const activeWhere: Prisma.CaseWhereInput = { organizationId: organization.id, status: { notIn: ['cloture', 'annule', 'brouillon'] }, ...(clientId ? { clientId } : {}) }
    const urgentWhere: Prisma.CaseWhereInput = { organizationId: organization.id, priority: { in: ['urgente', 'critique'] }, status: { notIn: ['cloture', 'annule'] }, ...(clientId ? { clientId } : {}) }
    const blockedWhere: Prisma.CaseWhereInput = { organizationId: organization.id, status: 'suspendu', ...(clientId ? { clientId } : {}) }
    const cases = await db.case.findMany({
        where,
        select: compact ? { id: true, reference: true, clientId: true } : {
          id: true, reference: true, type: true, direction: true, status: true, priority: true, merchandise: true,
          eta: true, createdAt: true, updatedAt: true, weightKg: true, packageCount: true, riskLevel: true,
          client: { select: { name: true } }, serviceChef: { select: { firstName: true, lastName: true } }, commercial: { select: { firstName: true, lastName: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      })
    const total = await db.case.count({ where })
    const active = await db.case.count({ where: activeWhere })
    const urgent = await db.case.count({ where: urgentWhere })
    const blocked = await db.case.count({ where: blockedWhere })

    return NextResponse.json({ items: cases, pagination: paginationMeta(total, page, pageSize), summary: { active, urgent, blocked } }, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
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

    const referenceInput = typeof body.reference === 'string' ? body.reference.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    const direction = typeof body.direction === 'string' ? body.direction.trim() : ''
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
    const serviceChefId = typeof body.serviceChefId === 'string' ? body.serviceChefId.trim() : ''

    if (!type || !direction || !clientId || !serviceChefId) {
      return NextResponse.json(
        { error: 'Type, direction, client et responsable sont obligatoires' },
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

    await assertSaaSQuota(organization.id, 'cases')

    const client = await db.client.findFirst({
      where: { id: clientId, organizationId: organization.id },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const chef = await db.profile.findFirst({
      where: { id: serviceChefId, organizationId: organization.id },
      select: { id: true },
    })

    if (!chef) {
      return NextResponse.json(
        { error: 'Responsable introuvable' },
        { status: 404 },
      )
    }

    const commercialId =
      typeof body.commercialId === 'string' && body.commercialId.trim()
        ? body.commercialId.trim()
        : null

    if (commercialId) {
      const commercial = await db.profile.findFirst({
        where: { id: commercialId, organizationId: organization.id },
        select: { id: true },
      })
      if (!commercial) {
        return NextResponse.json(
          { error: 'Commercial introuvable' },
          { status: 404 },
        )
      }
    }

    const settings = await db.organizationSettings.findFirst({
      where: { organizationId: organization.id },
      select: { casePrefix: true },
    })

    const count = await db.case.count({ where: { organizationId: organization.id } })
    const prefix = settings?.casePrefix?.trim() || 'IGS'
    const typeCode =
      type === 'maritime' ? 'MAR' : type === 'aerien' ? 'AER' : type === 'terrestre' ? 'TER' : 'MUL'
    const generatedReference = `${prefix}-${new Date().getFullYear()}-${typeCode}-${String(count + 1).padStart(4, '0')}`

    const caseRecord = await db.case.create({
      data: {
        organizationId: organization.id,
        reference: referenceInput || generatedReference,
        type,
        direction,
        status: typeof body.status === 'string' ? normalizeCaseStatus(body.status) ?? 'brouillon' : 'brouillon',
        priority: typeof body.priority === 'string' && body.priority.trim() ? body.priority.trim() : 'normale',
        clientId: client.id,
        serviceChefId: chef.id,
        commercialId,
        description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
        merchandise: typeof body.merchandise === 'string' && body.merchandise.trim() ? body.merchandise.trim() : null,
        incoterm: typeof body.incoterm === 'string' && body.incoterm.trim() ? body.incoterm.trim() : null,
        supplier: typeof body.supplier === 'string' && body.supplier.trim() ? body.supplier.trim() : null,
        shipper: typeof body.shipper === 'string' && body.shipper.trim() ? body.shipper.trim() : null,
        consignee: typeof body.consignee === 'string' && body.consignee.trim() ? body.consignee.trim() : null,
        originPort: typeof body.originPort === 'string' && body.originPort.trim() ? body.originPort.trim() : null,
        destinationPort: typeof body.destinationPort === 'string' && body.destinationPort.trim() ? body.destinationPort.trim() : null,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'GNF',
        declaredCurrency: typeof body.declaredCurrency === 'string' && body.declaredCurrency.trim() ? body.declaredCurrency.trim() : 'GNF',
        declaredValue: typeof body.declaredValue === 'number' ? body.declaredValue : null,
        estimatedRevenue: typeof body.estimatedRevenue === 'number' ? body.estimatedRevenue : null,
        estimatedCost: typeof body.estimatedCost === 'number' ? body.estimatedCost : null,
        weightKg: typeof body.weightKg === 'number' ? body.weightKg : null,
        volumeM3: typeof body.volumeM3 === 'number' ? body.volumeM3 : null,
        packageCount: typeof body.packageCount === 'number' ? body.packageCount : null,
        eta: typeof body.eta === 'string' && body.eta ? new Date(body.eta) : null,
        etd: typeof body.etd === 'string' && body.etd ? new Date(body.etd) : null,
        ata: typeof body.ata === 'string' && body.ata ? new Date(body.ata) : null,
      },
      include: {
        client: { select: { name: true } },
        serviceChef: { select: { firstName: true, lastName: true } },
        commercial: { select: { firstName: true, lastName: true } },
      },
    })

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'create', entityType: 'case', entityId: caseRecord.id, details: { reference: caseRecord.reference, type: caseRecord.type }, request })
    return NextResponse.json(caseRecord, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
