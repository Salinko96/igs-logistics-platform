import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
    }

    const caseRecord = await db.case.findFirst({
      where: { id, organizationId: profile.organizationId },
      select: { id: true, clientId: true },
    })

    if (!caseRecord) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    if (profile.role === 'CLIENT' && caseRecord.clientId !== profile.clientId) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    const isInternal =
      profile.role === 'CLIENT'
        ? false
        : body.isInternal === false
          ? false
          : true

    const comment = await db.comment.create({
      data: {
        organizationId: profile.organizationId,
        caseId: caseRecord.id,
        profileId: profile.id,
        content,
        isInternal,
      },
      include: {
        profile: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
