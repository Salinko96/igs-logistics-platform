import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeStoragePath,
  validateFileMetadata,
  BUCKET_NAME,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ensureTransitDocumentsBucket,
  uploadFileToStorage,
  generateSignedUrl,
  deleteFileFromStorage,
} from '../../lib/storage/supabase-storage'
import { POST as uploadHandler } from '../../app/api/documents/upload/route'
import { GET as signedUrlHandler } from '../../app/api/documents/[id]/signed-url/route'
import { NextRequest } from 'next/server'

describe('Supabase Storage Helper Library Unit Tests', () => {
  it('should maintain correct storage bucket constants', () => {
    assert.equal(BUCKET_NAME, 'transit-documents')
    assert.equal(MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024)
    assert.deepEqual(ALLOWED_MIME_TYPES, [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ])
  })

  it('should sanitize storage path by stripping leading slashes and whitespace', () => {
    assert.equal(sanitizeStoragePath('/cases/c123/doc.pdf'), 'cases/c123/doc.pdf')
    assert.equal(sanitizeStoragePath('///documents/general/test.png'), 'documents/general/test.png')
    assert.equal(sanitizeStoragePath(' cases/c123/file.jpg '), 'cases/c123/file.jpg')
  })

  it('should validate file metadata correctly for various file sizes and types', () => {
    // Valid PDF file (1MB)
    const validPdf = validateFileMetadata(1024 * 1024, 'application/pdf')
    assert.equal(validPdf.valid, true)
    assert.equal(validPdf.error, undefined)

    // Valid PNG file (5MB)
    const validPng = validateFileMetadata(5 * 1024 * 1024, 'image/png')
    assert.equal(validPng.valid, true)

    // Valid JPG file (500KB)
    const validJpg = validateFileMetadata(500 * 1024, 'image/jpeg')
    assert.equal(validJpg.valid, true)

    // Valid uppercase JPG MIME
    const validUpperJpg = validateFileMetadata(500 * 1024, 'IMAGE/JPG')
    assert.equal(validUpperJpg.valid, true)

    // Empty file (0 bytes)
    const emptyFile = validateFileMetadata(0, 'application/pdf')
    assert.equal(emptyFile.valid, false)
    assert.match(emptyFile.error || '', /0 octet/)

    // Oversized file (> 10MB)
    const oversizedFile = validateFileMetadata(11 * 1024 * 1024, 'application/pdf')
    assert.equal(oversizedFile.valid, false)
    assert.match(oversizedFile.error || '', /10 Mo/)

    // Invalid MIME type (text/plain)
    const invalidType = validateFileMetadata(1024, 'text/plain')
    assert.equal(invalidType.valid, false)
    assert.match(invalidType.error || '', /Format de fichier non autorisé/)
  })
})

describe('Supabase Storage Integration & Signed URL Live Tests', () => {
  const testPath = `documents/general/test_unit_${Date.now()}.pdf`
  const sampleBuffer = Buffer.from('%PDF-1.4 sample pdf content for unit test')

  it('should verify transit-documents bucket exists on Supabase', async () => {
    const bucketExists = await ensureTransitDocumentsBucket()
    assert.equal(bucketExists, true)
  })

  it('should upload a test PDF file to transit-documents bucket', async () => {
    const uploadRes = await uploadFileToStorage(sampleBuffer, testPath, 'application/pdf')
    assert.equal(uploadRes.error, null)
    assert.equal(uploadRes.fileUrl, testPath)
  })

  it('should generate a valid signed URL for the uploaded test PDF file', async () => {
    const signedRes = await generateSignedUrl(testPath, 300)
    assert.equal(signedRes.error, null)
    assert.ok(signedRes.signedUrl !== null)
    assert.ok(signedRes.signedUrl.includes('transit-documents'))
    assert.ok(signedRes.expiresAt !== null)
  })

  it('should clean up and delete the test PDF file from storage', async () => {
    const deleteRes = await deleteFileFromStorage(testPath)
    assert.equal(deleteRes.success, true)
    assert.equal(deleteRes.error, null)
  })
})

describe('API Route Security Unit Tests', () => {
  it('should return 401 Unauthorized for unauthenticated POST /api/documents/upload', async () => {
    const formData = new FormData()
    const fakeFile = new File(['sample content'], 'test.pdf', { type: 'application/pdf' })
    formData.append('file', fakeFile)

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await uploadHandler(request)
    assert.equal(response.status, 401)
    const json = await response.json()
    assert.equal(json.error, 'Non autorisé')
  })

  it('should return 401 Unauthorized for unauthenticated GET /api/documents/[id]/signed-url', async () => {
    const request = new NextRequest('http://localhost:3000/api/documents/doc-123/signed-url', {
      method: 'GET',
    })

    const params = Promise.resolve({ id: 'doc-123' })
    const response = await signedUrlHandler(request, { params })
    assert.equal(response.status, 401)
    const json = await response.json()
    assert.equal(json.error, 'Non autorisé')
  })
})
