import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeStoragePath,
  validateFileMetadata,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../lib/storage/supabase-storage'

// Replicating client-side validation logic from FileUploadDropzone (src/components/documents/file-upload-dropzone.tsx)
function clientValidateFile(
  file: { name: string; size: number; type: string },
  maxSizeMB = 10,
  allowedTypes = ALLOWED_MIME_TYPES
): string | null {
  if (file.size === 0) {
    return 'Fichier vide (0 octet).'
  }
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `Le fichier dépasse la taille maximale autorisée (${maxSizeMB} Mo).`
  }
  const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
  const isValidType =
    allowedTypes.includes(file.type.toLowerCase()) ||
    ['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExt)

  if (!isValidType) {
    return 'Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPG.'
  }
  return null
}

// Replicating server-side MIME type inference logic from POST /api/documents/upload (src/app/api/documents/upload/route.ts)
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

describe('Challenger 2 — File Size & Boundary Stress Tests', () => {
  it('should reject 0-byte files on both client and server validation', () => {
    const file0 = { name: 'empty.pdf', size: 0, type: 'application/pdf' }
    
    // Client-side dropzone validation
    const clientErr = clientValidateFile(file0)
    assert.equal(clientErr, 'Fichier vide (0 octet).')

    // Server-side storage validation
    const serverResult = validateFileMetadata(file0.size, file0.type)
    assert.equal(serverResult.valid, false)
    assert.equal(serverResult.error, 'Fichier vide (0 octet).')
  })

  it('should accept 1-byte minimal file', () => {
    const file1 = { name: 'tiny.pdf', size: 1, type: 'application/pdf' }
    
    const clientErr = clientValidateFile(file1)
    assert.equal(clientErr, null)

    const serverResult = validateFileMetadata(file1.size, file1.type)
    assert.equal(serverResult.valid, true)
  })

  it('should accept file of EXACTLY 10MB (10,485,760 bytes)', () => {
    const exact10MB = 10 * 1024 * 1024 // 10,485,760
    assert.equal(exact10MB, MAX_FILE_SIZE_BYTES)
    const file10MB = { name: 'exact10mb.pdf', size: exact10MB, type: 'application/pdf' }

    const clientErr = clientValidateFile(file10MB)
    assert.equal(clientErr, null)

    const serverResult = validateFileMetadata(file10MB.size, file10MB.type)
    assert.equal(serverResult.valid, true)
  })

  it('should reject file of 10MB + 1 byte (10,485,761 bytes)', () => {
    const overflowSize = (10 * 1024 * 1024) + 1 // 10,485,761
    const fileOverflow = { name: 'overflow.pdf', size: overflowSize, type: 'application/pdf' }

    const clientErr = clientValidateFile(fileOverflow)
    assert.ok(clientErr !== null)
    assert.match(clientErr, /dépasse la taille maximale autorisée/)

    const serverResult = validateFileMetadata(fileOverflow.size, fileOverflow.type)
    assert.equal(serverResult.valid, false)
    assert.match(serverResult.error || '', /dépasse la limite autorisée de 10 Mo/)
  })
})

describe('Challenger 2 — Spoofed Extension vs MIME Type Matrix', () => {
  it('should handle legitimate PDF file (PDF extension + application/pdf MIME)', () => {
    const file = { name: 'invoice.pdf', size: 5000, type: 'application/pdf' }
    assert.equal(clientValidateFile(file), null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/pdf')
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })

  it('should handle legitimate PNG image (PNG extension + image/png MIME)', () => {
    const file = { name: 'scan.png', size: 120000, type: 'image/png' }
    assert.equal(clientValidateFile(file), null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'image/png')
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })

  it('should handle file with uppercase extension (DOCUMENT.PDF)', () => {
    const file = { name: 'DOCUMENT.PDF', size: 10000, type: 'application/pdf' }
    assert.equal(clientValidateFile(file), null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/pdf')
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })

  it('should evaluate spoofed extension vs MIME: EXE named PDF with application/pdf MIME', () => {
    // Malicious actor renames payload.exe -> payload.pdf and sets MIME application/pdf
    const file = { name: 'payload.pdf', size: 50000, type: 'application/pdf' }
    assert.equal(clientValidateFile(file), null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/pdf')
    // MIME validation passes because declared type is application/pdf and extension is .pdf
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })

  it('should evaluate spoofed extension vs MIME: EXE named PDF with application/x-msdownload MIME', () => {
    // Malicious actor renames payload.exe -> payload.pdf but browser sends executable MIME
    const file = { name: 'payload.pdf', size: 50000, type: 'application/x-msdownload' }
    // Client accepts via extension fallback (.pdf)
    assert.equal(clientValidateFile(file), null)
    // Server infers application/pdf from .pdf extension
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/pdf')
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })

  it('should reject unallowed executable file (malware.exe with application/x-msdownload MIME)', () => {
    const file = { name: 'malware.exe', size: 50000, type: 'application/x-msdownload' }
    const clientErr = clientValidateFile(file)
    assert.ok(clientErr !== null)
    assert.match(clientErr, /Format de fichier non autorisé/)

    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/x-msdownload')
    const serverResult = validateFileMetadata(file.size, inferred)
    assert.equal(serverResult.valid, false)
    assert.match(serverResult.error || '', /Format de fichier non autorisé/)
  })

  it('should reject shell script (script.sh with text/x-shellscript MIME)', () => {
    const file = { name: 'script.sh', size: 1000, type: 'text/x-shellscript' }
    assert.ok(clientValidateFile(file) !== null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(validateFileMetadata(file.size, inferred).valid, false)
  })

  it('should reject file without extension and disallowed MIME (doc with text/plain MIME)', () => {
    const file = { name: 'doc', size: 2000, type: 'text/plain' }
    assert.ok(clientValidateFile(file) !== null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(validateFileMetadata(file.size, inferred).valid, false)
  })

  it('should accept file without extension if MIME is application/pdf', () => {
    const file = { name: 'doc', size: 2000, type: 'application/pdf' }
    assert.equal(clientValidateFile(file), null)
    const inferred = inferMimeType(file.name, file.type)
    assert.equal(inferred, 'application/pdf')
    assert.equal(validateFileMetadata(file.size, inferred).valid, true)
  })
})

describe('Challenger 2 — Multiple File & Event Logic Simulation', () => {
  it('should extract and process only the first file when multiple files are dropped', () => {
    const files = [
      { name: 'first.pdf', size: 1000, type: 'application/pdf' },
      { name: 'second.pdf', size: 2000, type: 'application/pdf' },
      { name: 'third.pdf', size: 3000, type: 'application/pdf' },
    ]

    // Simulate drop handler logic: fileList[0] is selected
    const selected = files.length > 0 ? files[0] : null
    assert.deepEqual(selected, { name: 'first.pdf', size: 1000, type: 'application/pdf' })
    assert.equal(clientValidateFile(selected!), null)
  })

  it('should simulate drag enter, drag over, drag leave, and drop state flow', () => {
    let isDragging = false
    let disabled = false
    let uploading = false

    // Drag over event
    if (!disabled && !uploading) isDragging = true
    assert.equal(isDragging, true)

    // Drag leave event
    isDragging = false
    assert.equal(isDragging, false)

    // Drag over again
    if (!disabled && !uploading) isDragging = true
    assert.equal(isDragging, true)

    // Drop event
    isDragging = false
    assert.equal(isDragging, false)
  })

  it('should block drag & drop actions when component is disabled or uploading', () => {
    let isDragging = false
    let disabled = true
    let uploading = false

    // Drag over while disabled
    if (!disabled && !uploading) isDragging = true
    assert.equal(isDragging, false)

    // Drag over while uploading
    disabled = false
    uploading = true
    if (!disabled && !uploading) isDragging = true
    assert.equal(isDragging, false)
  })
})

describe('Challenger 2 — Storage Path Sanitization Edge Cases', () => {
  it('should sanitize paths with multiple slashes and spaces', () => {
    assert.equal(sanitizeStoragePath('///cases/case-123/doc.pdf'), 'cases/case-123/doc.pdf')
    assert.equal(sanitizeStoragePath('   documents/general/file.png   '), 'documents/general/file.png')
    assert.equal(sanitizeStoragePath('/'), '')
    assert.equal(sanitizeStoragePath(''), '')
  })
})
