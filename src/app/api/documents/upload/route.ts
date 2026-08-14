import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  uploadFileToStorage,
  validateFileMetadata,
  ALLOWED_MIME_TYPES,
} from '@/lib/storage/supabase-storage'
import { logAudit } from '@/lib/audit'
import { assertSaaSQuota, quotaErrorResponse } from '@/lib/saas/usage'

export const dynamic = 'force-dynamic'

function inferMimeType(filename: string, contentType: string): string {
  if (contentType && ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
    return contentType.toLowerCase()
  }
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    default:
      return contentType || 'application/octet-stream'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()

    if (!user || !profile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caseId = (formData.get('caseId') as string) || undefined
    const category = (formData.get('category') as string) || 'autre'
    const customName = (formData.get('name') as string) || undefined
    const sharedWithClientStr = formData.get('sharedWithClient') as string
    const sharedWithClient = sharedWithClientStr === 'true'
    const notes = (formData.get('notes') as string) || undefined
    const createDbRecord = formData.get('createDbRecord') !== 'false'

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    // Role-based upload permissions
    const isStaff = ['ADMIN', 'AGENT', 'EXPLOITANT'].includes(profile.role)
    if (!isStaff && profile.role === 'CLIENT') {
      if (!caseId) {
        return NextResponse.json(
          { error: 'Accès interdit : Seuls les agents et administrateurs peuvent téléverser des documents généraux' },
          { status: 403 }
        )
      }
      // If client is uploading to a specific case, verify case ownership
      const existingCase = await db.case.findUnique({
        where: { id: caseId },
        select: { clientId: true },
      })
      if (!existingCase || existingCase.clientId !== profile.clientId) {
        return NextResponse.json({ error: 'Accès interdit : Dossier non associé à votre compte' }, { status: 403 })
      }
    } else if (!isStaff) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    // Determine final MIME type
    const mimeType = inferMimeType(file.name, file.type)

    // Validate size and MIME type
    const validation = validateFileMetadata(file.size, mimeType)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    await assertSaaSQuota(profile.organizationId, 'storage', file.size)

    // Validate case existence if caseId is provided
    if (caseId) {
      const targetCase = await db.case.findUnique({
        where: { id: caseId },
        select: { id: true, organizationId: true },
      })

      if (!targetCase) {
        return NextResponse.json({ error: 'Dossier spécifié introuvable' }, { status: 404 })
      }

      if (targetCase.organizationId !== profile.organizationId) {
        return NextResponse.json({ error: 'Dossier spécifié introuvable' }, { status: 404 })
      }
    }

    // Prepare storage path: /cases/{caseId}/{timestamp}_{filename} or /documents/general/{timestamp}_{filename}
    const cleanFileName = (customName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_')
    const timestamp = Date.now()
    const storagePath = caseId
      ? `${profile.organizationId}/cases/${caseId}/${timestamp}_${cleanFileName}`
      : `${profile.organizationId}/documents/general/${timestamp}_${cleanFileName}`

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage bucket 'transit-documents'
    const { fileUrl, error: uploadError } = await uploadFileToStorage(
      buffer,
      storagePath,
      mimeType
    )

    if (uploadError) {
      return NextResponse.json(
        { error: `Échec du téléversement vers Supabase Storage: ${uploadError}` },
        { status: 500 }
      )
    }

    const documentName = customName || file.name

    let dbDocument: Record<string, unknown> | null = null
    if (createDbRecord) {
      dbDocument = (await db.document.create({
        data: {
          organizationId: profile.organizationId,
          name: documentName,
          category,
          caseId: caseId || null,
          fileUrl,
          fileSize: file.size,
          fileType: mimeType,
          status: 'recu',
          sharedWithClient,
          uploadedById: profile.id,
          notes: notes || null,
        },
      })) as unknown as Record<string, unknown>
    }

    await logAudit({ organizationId: profile.organizationId, profileId: profile.id, action: 'upload', entityType: 'document', entityId: typeof dbDocument?.id === 'string' ? dbDocument.id : null, details: { caseId: caseId || null, fileType: mimeType, fileSize: file.size }, request })

    return NextResponse.json(
      {
        fileUrl,
        fileSize: file.size,
        fileType: mimeType,
        name: documentName,
        ...(dbDocument ? { document: dbDocument } : {}),
      },
      { status: 201 }
    )
  } catch (err) {
    const quota = quotaErrorResponse(err)
    if (quota) return NextResponse.json(quota, { status: 402 })
    console.error('API Error in POST /api/documents/upload:', err)
    return NextResponse.json(
      { error: 'Erreur serveur lors du téléversement du fichier' },
      { status: 500 }
    )
  }
}
