import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateSignedUrl } from '@/lib/storage/supabase-storage'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await getSessionProfile()

    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Identifiant document requis' }, { status: 400 })
    }

    // Fetch document with related case details
    const document = await db.document.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            clientId: true,
            organizationId: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Organization multi-tenancy check
    if (document.organizationId !== profile.organizationId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Role-based access control
    const isStaff = ['ADMIN', 'AGENT', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'].includes(profile.role)
    const isClient = profile.role === 'CLIENT'

    if (isClient) {
      // Clients can only access documents explicitly marked as shared with client
      if (!document.sharedWithClient) {
        return NextResponse.json({ error: 'Accès interdit : Document non partagé' }, { status: 403 })
      }

      // If document is linked to a case, verify it belongs to this client
      if (document.caseId && document.case) {
        if (document.case.clientId !== profile.clientId) {
          return NextResponse.json({ error: 'Accès interdit : Document d\'un autre client' }, { status: 403 })
        }
      }
    } else if (!isStaff) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    if (!document.fileUrl) {
      return NextResponse.json({ error: 'Aucun fichier physique associé à ce document' }, { status: 404 })
    }

    // Optional query param for custom expiration (default 300s)
    const { searchParams } = new URL(request.url)
    const expiresInQuery = searchParams.get('expiresIn')
    const expiresIn = expiresInQuery ? Math.min(Math.max(parseInt(expiresInQuery, 10) || 300, 60), 3600) : 300

    // Generate short-lived signed URL
    const { signedUrl, expiresAt, error } = await generateSignedUrl(document.fileUrl, expiresIn)

    if (error || !signedUrl) {
      return NextResponse.json(
        { error: error || 'Erreur lors de la génération de l\'URL signée' },
        { status: 500 }
      )
    }

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'document_accessed', entityType: 'document', entityId: document.id, details: { expiresIn }, request })

    return NextResponse.json({
      documentId: document.id,
      signedUrl,
      expiresAt,
      fileType: document.fileType,
      name: document.name,
    })
  } catch (err) {
    console.error('API Error in GET /api/documents/[id]/signed-url:', err)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération de l\'URL signée' },
      { status: 500 }
    )
  }
}
