import { DOCUMENT_CATEGORIES } from '@/lib/constants'

export type DocumentAnalysisSource = 'pdf_text' | 'ocr' | 'filename'

export interface ExtractedDocumentData {
  documentNumber?: string
  blNumber?: string
  awbNumber?: string
  invoiceNumber?: string
  containerNumbers: string[]
  dates: string[]
  amounts: string[]
}

export interface DocumentAnalysis {
  name: string
  category: string
  notes: string
  confidence: number
  source: DocumentAnalysisSource
  extracted: ExtractedDocumentData
  warning?: string
}

const CATEGORY_RULES: Array<{ category: string; patterns: RegExp[] }> = [
  { category: 'awb', patterns: [/\bair\s*waybill\b/i, /\bairway\s*bill\b/i, /\bawb\b/i, /lettre de transport aerien/i] },
  { category: 'bl', patterns: [/\bbill\s+of\s+lading\b/i, /\bsea\s+waybill\b/i, /\bconnaissement\b/i, /\bb\s*\/\s*l\b/i] },
  { category: 'packing_list', patterns: [/\bpacking\s+list\b/i, /liste de colisage/i, /bordereau de colisage/i] },
  { category: 'certificat_origine', patterns: [/certificate of origin/i, /certificat d[' ]origine/i] },
  { category: 'declaration', patterns: [/declaration (?:en )?douane/i, /customs declaration/i, /\bsydonia\b/i, /\bguceg\b/i] },
  { category: 'quitus', patterns: [/\bquitus\b/i] },
  { category: 'bon_livraison', patterns: [/bon de livraison/i, /delivery (?:note|order)/i] },
  { category: 'preuve_paiement', patterns: [/preuve de paiement/i, /payment (?:receipt|confirmation|proof)/i, /recu de paiement/i] },
  { category: 'facture_commerciale', patterns: [/facture commerciale/i, /commercial invoice/i, /\binvoice\b/i, /\bfacture\b/i] },
]

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return undefined
}

function uniqueMatches(text: string, pattern: RegExp, limit: number): string[] {
  return [...text.matchAll(pattern)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, limit)
}

function categoryLabel(category: string) {
  return DOCUMENT_CATEGORIES.find((item) => item.value === category)?.label ?? 'Document'
}

function detectCategory(text: string): { category: string; contentMatch: boolean } {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return { category: rule.category, contentMatch: true }
    }
  }
  return { category: 'autre', contentMatch: false }
}

export function analyzeDocumentText(filename: string, content = ''): DocumentAnalysis {
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  const normalizedFilename = normalize(baseName)
  const normalizedContent = normalize(content.slice(0, 80_000))
  const searchable = `${normalizedFilename}\n${normalizedContent}`
  const detailText = normalizedContent || normalizedFilename
  const categoryResult = detectCategory(searchable)

  const blNumber = firstMatch(detailText, [
    /(?:bill of lading|b\s*\/\s*l|bl|connaissement)(?:\s*(?:no|n[o°.]|number|numero))?\s*[:#-]?\s*([a-z0-9][a-z0-9/-]{5,24})/i,
  ])
  const awbNumber = firstMatch(detailText, [
    /(?:air\s*waybill|awb)(?:\s*(?:no|n[o°.]|number|numero))?\s*[:#-]?\s*([0-9]{3}[- ]?[0-9]{8}|[a-z0-9/-]{6,24})/i,
  ])
  const invoiceNumber = firstMatch(detailText, [
    /(?:commercial invoice|invoice|facture)(?:\s*(?:no|n[o°.]|number|numero))?\s*[:#-]?\s*([a-z0-9][a-z0-9/-]{3,24})/i,
  ])
  const documentNumber = firstMatch(detailText, [
    /(?:document|reference|ref)(?:\s*(?:no|n[o°.]|number|numero))?\s*[:#-]?\s*([a-z0-9][a-z0-9/-]{3,24})/i,
  ])
  const containerNumbers = uniqueMatches(detailText.toUpperCase(), /\b([A-Z]{4}\s?\d{7})\b/g, 5)
    .map((value) => value.replace(/\s/g, ''))
  const dates = uniqueMatches(detailText, /\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2})\b/g, 3)
  const amounts = uniqueMatches(detailText, /((?:USD|EUR|GNF|XOF|FG|\$|€)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:USD|EUR|GNF|XOF|FG))/gi, 3)

  const extracted: ExtractedDocumentData = {
    documentNumber,
    blNumber,
    awbNumber,
    invoiceNumber,
    containerNumbers,
    dates,
    amounts,
  }
  const primaryNumber = blNumber ?? awbNumber ?? invoiceNumber ?? documentNumber
  const detectedDetails = [
    blNumber ? `BL : ${blNumber}` : null,
    awbNumber ? `AWB : ${awbNumber}` : null,
    invoiceNumber ? `Facture : ${invoiceNumber}` : null,
    !blNumber && !awbNumber && !invoiceNumber && documentNumber ? `Référence : ${documentNumber}` : null,
    containerNumbers.length ? `Conteneur${containerNumbers.length > 1 ? 's' : ''} : ${containerNumbers.join(', ')}` : null,
    dates.length ? `Date${dates.length > 1 ? 's' : ''} : ${dates.join(', ')}` : null,
    amounts.length ? `Montant${amounts.length > 1 ? 's' : ''} : ${amounts.join(', ')}` : null,
  ].filter(Boolean)
  const hasPdfText = normalizedContent.length >= 20
  const confidence = Math.min(98, 35 + (categoryResult.contentMatch ? 30 : 0) + (primaryNumber ? 18 : 0) + (containerNumbers.length ? 10 : 0) + (hasPdfText ? 5 : 0))
  const suggestedName = primaryNumber
    ? `${categoryLabel(categoryResult.category)} - ${primaryNumber}`
    : categoryResult.category !== 'autre'
      ? categoryLabel(categoryResult.category)
      : baseName || 'Document'

  return {
    name: suggestedName,
    category: categoryResult.category,
    notes: detectedDetails.length ? `Extraction automatique - ${detectedDetails.join(' | ')}` : '',
    confidence,
    source: hasPdfText ? 'pdf_text' : 'filename',
    extracted,
    ...(!hasPdfText ? { warning: 'Aucun texte exploitable détecté : vérifiez les suggestions avant enregistrement.' } : {}),
  }
}

export function analysisSearchTerms(analysis: DocumentAnalysis): string[] {
  return [
    analysis.extracted.blNumber,
    analysis.extracted.awbNumber,
    analysis.extracted.documentNumber,
    ...analysis.extracted.containerNumbers,
  ].filter((value): value is string => Boolean(value)).map(normalizedDocumentValue)
}

export function normalizedDocumentValue(value: string | null | undefined) {
  return normalize(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
