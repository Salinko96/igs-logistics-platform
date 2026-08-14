import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { getSessionProfile } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALLOWED_MIME_TYPES, validateFileMetadata } from '@/lib/storage/supabase-storage'
import {
  analysisSearchTerms,
  analyzeDocumentText,
  normalizedDocumentValue,
} from '@/lib/documents/document-analysis'
import { recognizeDocumentImages } from '@/lib/documents/image-ocr'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function inferMimeType(filename: string, contentType: string): string {
  if (contentType && ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) return contentType.toLowerCase()
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  return contentType || 'application/octet-stream'
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText({ first: 5 })
    return result.text.slice(0, 80_000)
  } finally {
    await parser.destroy()
  }
}

async function renderPdfPages(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getScreenshot({
      first: 2,
      desiredWidth: 1_800,
      imageDataUrl: false,
      imageBuffer: true,
    })
    return result.pages.map((page) => Buffer.from(page.data))
  } finally {
    await parser.destroy()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile()
    if (!user || !profile || (profile.role !== 'ADMIN' && profile.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const mimeType = inferMimeType(file.name, file.type)
    const validation = validateFileMetadata(file.size, mimeType)
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let content = ''
    let source: 'pdf_text' | 'ocr' | 'filename' = 'filename'
    let ocrConfidence: number | undefined
    let analysisWarning: string | undefined
    if (mimeType === 'application/pdf') {
      try {
        content = await extractPdfText(fileBuffer)
        if (content.trim().length >= 30) source = 'pdf_text'
      } catch {
        content = ''
      }
      if (content.trim().length < 30) {
        try {
          const ocr = await recognizeDocumentImages(await renderPdfPages(fileBuffer))
          content = ocr.text
          ocrConfidence = ocr.confidence
          source = content ? 'ocr' : 'filename'
        } catch {
          analysisWarning = 'Le PDF scanné n’a pas pu être OCRisé. Vérifiez les informations proposées.'
        }
      }
    } else {
      try {
        const ocr = await recognizeDocumentImages([fileBuffer])
        content = ocr.text
        ocrConfidence = ocr.confidence
        source = content ? 'ocr' : 'filename'
      } catch {
        analysisWarning = 'L’image n’a pas pu être OCRisée. Vérifiez les informations proposées.'
      }
    }

    const analysis = analyzeDocumentText(file.name, content)
    const cases = await db.case.findMany({
      where: { organizationId: profile.organizationId },
      select: {
        id: true,
        reference: true,
        gucegRef: true,
        sydoniaRef: true,
        shipments: { select: { blNumber: true, bookingNumber: true, containers: { select: { containerNumber: true } } } },
        flights: { select: { awbNumber: true } },
        customsDeclarations: { select: { declarationNumber: true, gucegRef: true, sydoniaRef: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    const searchableText = normalizedDocumentValue(`${file.name} ${content}`)
    const terms = analysisSearchTerms(analysis)
    const matchedCase = cases.find((item) => {
      const values = [
        item.reference,
        item.gucegRef,
        item.sydoniaRef,
        ...item.shipments.flatMap((shipment) => [
          shipment.blNumber,
          shipment.bookingNumber,
          ...shipment.containers.map((container) => container.containerNumber),
        ]),
        ...item.flights.map((flight) => flight.awbNumber),
        ...item.customsDeclarations.flatMap((declaration) => [declaration.declarationNumber, declaration.gucegRef, declaration.sydoniaRef]),
      ].map(normalizedDocumentValue).filter((value) => value.length >= 4)
      return values.some((value) => searchableText.includes(value) || terms.includes(value))
    })

    return NextResponse.json({
      ...analysis,
      source,
      ...(matchedCase ? { caseId: matchedCase.id, caseReference: matchedCase.reference } : {}),
      confidence: Math.min(99, Math.round(
        source === 'ocr' && ocrConfidence != null
          ? (analysis.confidence * 0.75) + (ocrConfidence * 0.25) + (matchedCase ? 10 : 0)
          : analysis.confidence + (matchedCase ? 10 : 0),
      )),
      ...(ocrConfidence != null ? { ocrConfidence } : {}),
      warning: analysisWarning ?? analysis.warning,
    })
  } catch (error) {
    console.error('API Error in POST /api/documents/analyze:', error)
    return NextResponse.json({ error: 'Impossible d’analyser ce document. Vous pouvez continuer la saisie manuellement.' }, { status: 500 })
  }
}
