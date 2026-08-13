import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'
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

    if (!organization) {
      return NextResponse.json({ items: [], pagination: paginationMeta(0, 1, 12), summary: { validated: 0, pending: 0, rejected: 0 } })
    }

    const whereClause: Prisma.DocumentWhereInput = {
      organizationId: organization.id,
    }

    if (profile.role === 'CLIENT') {
      if (!profile.clientId) {
        return NextResponse.json({ items: [], pagination: paginationMeta(0, 1, 12), summary: { validated: 0, pending: 0, rejected: 0 } })
      }
      whereClause.sharedWithClient = true
      whereClause.case = {
        clientId: profile.clientId,
      }
    }

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams, 12)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.trim()
    if (category && category !== 'all') whereClause.category = category
    if (search) whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { fileType: { contains: search, mode: 'insensitive' } },
      { case: { reference: { contains: search, mode: 'insensitive' } } },
      { case: { client: { name: { contains: search, mode: 'insensitive' } } } },
    ]
    const baseWhere: Prisma.DocumentWhereInput = { organizationId: organization.id, ...(profile.role === 'CLIENT' ? { sharedWithClient: true, case: { clientId: profile.clientId || '__none__' } } : {}) }
    // The Supabase transaction pool uses one connection; sequential reads avoid pool contention.
    const documents = await db.document.findMany({ where: whereClause, include: { case: { select: { reference: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize })
    const total = await db.document.count({ where: whereClause })
    const validated = await db.document.count({ where: { ...baseWhere, status: { in: ['valide', 'conforme'] } } })
    const pending = await db.document.count({ where: { ...baseWhere, status: { in: ['recu', 'en_attente', 'en_verification'] } } })
    const rejected = await db.document.count({ where: { ...baseWhere, status: { in: ['rejete', 'non_conforme'] } } })

    return NextResponse.json({ items: documents, pagination: paginationMeta(total, page, pageSize), summary: { validated, pending, rejected } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
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
      return NextResponse.json({ error: 'Nom du document requis' }, { status: 400 })
    }

    const organization = await db.organization.findFirst({
      where: { id: profile.organizationId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!organization) {
      return NextResponse.json({ error: 'Aucune organisation active trouvée' }, { status: 400 })
    }

    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0
    if (fileSize > 0) await assertSaaSQuota(organization.id, 'storage', fileSize)

    const caseId = typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null
    if (caseId) {
      const caseRecord = await db.case.findFirst({
        where: { id: caseId, organizationId: organization.id },
        select: { id: true },
      })
      if (!caseRecord) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }
    }

    const document = await db.document.create({
      data: {
        organizationId: organization.id,
        caseId,
        name,
        category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'autre',
        fileType: typeof body.fileType === 'string' && body.fileType.trim() ? body.fileType.trim() : null,
        fileSize: typeof body.fileSize === 'number' ? body.fileSize : null,
        fileUrl: typeof body.fileUrl === 'string' && body.fileUrl.trim() ? body.fileUrl.trim() : null,
        status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'recu',
        sharedWithClient: Boolean(body.sharedWithClient),
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      },
      include: { case: { select: { reference: true } } },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
