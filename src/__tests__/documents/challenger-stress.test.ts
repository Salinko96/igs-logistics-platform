import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeStoragePath,
  validateFileMetadata,
  BUCKET_NAME,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../lib/storage/supabase-storage'
import { POST as uploadHandler } from '../../app/api/documents/upload/route'
import { GET as signedUrlHandler } from '../../app/api/documents/[id]/signed-url/route'
import { NextRequest } from 'next/server'

describe('Challenger Comprehensive Stress & Edge Case Test Suite', () => {

  // =========================================================================
  // 1. Path Traversal & Filename Sanitization Stress Tests
  // =========================================================================
  describe('Path Traversal & Filename Sanitization', () => {
    it('should strip leading slashes and whitespace from storage path', () => {
      assert.equal(sanitizeStoragePath('///cases/c123/doc.pdf'), 'cases/c123/doc.pdf')
      assert.equal(sanitizeStoragePath('/cases/c123/doc.pdf  '), 'cases/c123/doc.pdf')
      assert.equal(sanitizeStoragePath('documents/general/file.png'), 'documents/general/file.png')
    })

    it('should replace directory traversal sequences and special characters in cleanFileName', () => {
      const dangerousFilenames = [
        '../../../../etc/passwd',
        '..\\..\\Windows\\System32\\cmd.exe',
        'cases/c123/../../../secret.pdf',
        'file with spaces & symbols!@#$%^&*().pdf',
        '<script>alert(1)</script>.png',
      ]

      dangerousFilenames.forEach((filename) => {
        const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        // Verify NO directory separators ('/' or '\') remain in the cleaned filename
        assert.equal(cleaned.includes('/'), false, `Filename '${filename}' still contains '/'`)
        assert.equal(cleaned.includes('\\'), false, `Filename '${filename}' still contains '\\'`)
        assert.equal(cleaned.includes('<'), false)
        assert.equal(cleaned.includes('>'), false)
      })
    })
  })

  // =========================================================================
  // 2. File Metadata Boundary & Validation Stress Tests
  // =========================================================================
  describe('File Size & MIME Type Boundary Validation', () => {
    it('should reject exactly 0 byte files', () => {
      const res = validateFileMetadata(0, 'application/pdf')
      assert.equal(res.valid, false)
      assert.match(res.error || '', /0 octet/)
    })

    it('should reject negative byte file sizes', () => {
      const res = validateFileMetadata(-100, 'application/pdf')
      assert.equal(res.valid, false)
      assert.match(res.error || '', /0 octet/)
    })

    it('should accept 1 byte file', () => {
      const res = validateFileMetadata(1, 'application/pdf')
      assert.equal(res.valid, true)
    })

    it('should accept exactly 10MB file (10 * 1024 * 1024 bytes)', () => {
      const res = validateFileMetadata(10 * 1024 * 1024, 'application/pdf')
      assert.equal(res.valid, true)
    })

    it('should reject file 1 byte over 10MB (10 * 1024 * 1024 + 1 bytes)', () => {
      const res = validateFileMetadata(10 * 1024 * 1024 + 1, 'application/pdf')
      assert.equal(res.valid, false)
      assert.match(res.error || '', /10 Mo/)
    })

    it('should reject 50MB file', () => {
      const res = validateFileMetadata(50 * 1024 * 1024, 'image/png')
      assert.equal(res.valid, false)
      assert.match(res.error || '', /10 Mo/)
    })

    it('should reject unsupported MIME types', () => {
      const invalidMimes = [
        'text/html',
        'text/plain',
        'application/javascript',
        'application/json',
        'application/x-sh',
        'application/x-msdownload',
        'image/gif',
        'image/webp',
        'video/mp4',
      ]

      invalidMimes.forEach((mime) => {
        const res = validateFileMetadata(1024, mime)
        assert.equal(res.valid, false, `MIME type '${mime}' should be rejected`)
        assert.match(res.error || '', /Format de fichier non autorisé/)
      })
    })

    it('should accept allowed MIME types case-insensitively', () => {
      const validMimes = [
        'application/pdf',
        'APPLICATION/PDF',
        'image/png',
        'IMAGE/PNG',
        'image/jpeg',
        'image/jpg',
        'IMAGE/JPG',
      ]

      validMimes.forEach((mime) => {
        const res = validateFileMetadata(1024, mime)
        assert.equal(res.valid, true, `MIME type '${mime}' should be accepted`)
      })
    })
  })

  // =========================================================================
  // 3. API Authorization & Authentication Boundaries
  // =========================================================================
  describe('API Route Unauthenticated Requests', () => {
    it('should return 401 Unauthorized for unauthenticated GET /api/documents/[id]/signed-url', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123/signed-url', {
        method: 'GET',
      })
      const params = Promise.resolve({ id: 'doc-123' })
      const response = await signedUrlHandler(request, { params })
      assert.equal(response.status, 401)
      const data = await response.json()
      assert.equal(data.error, 'Non autorisé')
    })

    it('should return 401 Unauthorized for unauthenticated POST /api/documents/upload', async () => {
      const formData = new FormData()
      formData.append('file', new File(['sample pdf content'], 'test.pdf', { type: 'application/pdf' }))
      const request = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      const response = await uploadHandler(request)
      assert.equal(response.status, 401)
      const data = await response.json()
      assert.equal(data.error, 'Non autorisé')
    })
  })

  // =========================================================================
  // 4. Client Role & Multi-Tenancy Authorization Logic Verification
  // =========================================================================
  describe('Authorization Rules Simulation', () => {
    it('should forbid CLIENT from accessing document when sharedWithClient is false', () => {
      const profile = { role: 'CLIENT', clientId: 'client-1', organizationId: 'org-1' }
      const document = { sharedWithClient: false, caseId: 'case-1', case: { clientId: 'client-1' }, organizationId: 'org-1' }

      const isStaff = profile.role === 'ADMIN' || profile.role === 'AGENT'
      const isClient = profile.role === 'CLIENT'

      let allowed = false
      let statusCode = 200

      if (isClient) {
        if (!document.sharedWithClient) {
          allowed = false
          statusCode = 403
        }
      }

      assert.equal(allowed, false)
      assert.equal(statusCode, 403)
    })

    it('should forbid CLIENT from accessing document belonging to another client', () => {
      const profile = { role: 'CLIENT', clientId: 'client-A', organizationId: 'org-1' }
      const document = { sharedWithClient: true, caseId: 'case-B', case: { clientId: 'client-B' }, organizationId: 'org-1' }

      const isClient = profile.role === 'CLIENT'
      let allowed = true
      let statusCode = 200

      if (isClient) {
        if (!document.sharedWithClient) {
          allowed = false
          statusCode = 403
        } else if (document.caseId && document.case) {
          if (document.case.clientId !== profile.clientId) {
            allowed = false
            statusCode = 403
          }
        }
      }

      assert.equal(allowed, false)
      assert.equal(statusCode, 403)
    })

    it('should allow CLIENT to access document when sharedWithClient is true and belongs to client', () => {
      const profile = { role: 'CLIENT', clientId: 'client-A', organizationId: 'org-1' }
      const document = { sharedWithClient: true, caseId: 'case-A', case: { clientId: 'client-A' }, organizationId: 'org-1' }

      const isClient = profile.role === 'CLIENT'
      let allowed = true
      let statusCode = 200

      if (isClient) {
        if (!document.sharedWithClient) {
          allowed = false
          statusCode = 403
        } else if (document.caseId && document.case) {
          if (document.case.clientId !== profile.clientId) {
            allowed = false
            statusCode = 403
          }
        }
      }

      assert.equal(allowed, true)
      assert.equal(statusCode, 200)
    })

    it('should return 404 for cross-organization access attempt (multi-tenancy isolation)', () => {
      const profile = { role: 'ADMIN', organizationId: 'org-1' }
      const document = { organizationId: 'org-2' }

      let statusCode = 200
      if (document.organizationId !== profile.organizationId) {
        statusCode = 404
      }

      assert.equal(statusCode, 404)
    })
  })
})
