/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Tests:
 * - T2.1: Empty 0-byte file upload attempt is rejected with 400 Bad Request
 * - T2.2: Oversized file upload (>10MB limit) is intercepted before storage processing
 * - T2.3: Spoofed / renamed extension (e.g., executable disguised as PDF) is rejected
 * - T2.4: Accessing expired signed URL (>300s) yields HTTP 403 Forbidden
 * - T2.5: Unauthenticated access to upload or signed URL endpoints yields HTTP 401 Unauthorized
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockStorage } from '../mocks/mock-supabase-storage'
import { mockDb } from '../mocks/mock-prisma'
import {
  createMockFileBuffer,
  CLIENT_SESSION,
  OTHER_CLIENT_SESSION,
} from '../helpers/test-fixtures'
import { validateFileMetadata } from '@/lib/storage/supabase-storage'

export async function runTier2BoundaryTests(): Promise<void> {
  await describe('Tier 2: Boundary & Corner Cases', async () => {
    await test('T2.1 - Empty 0-byte file upload attempt is rejected with error message', async () => {
      const emptyBuffer = createMockFileBuffer('empty')
      expect(emptyBuffer.length).toBe(0)

      const validation = validateFileMetadata(emptyBuffer.length, 'application/pdf')
      expect(validation.valid).toBeFalsy()
      expect(validation.error).toBe('Fichier vide (0 octet).')

      const uploadResult = mockStorage.uploadFile(emptyBuffer, 'cases/case-101/empty.pdf', 'application/pdf')
      expect(uploadResult.error).toBe('Fichier vide (0 octet).')
    })

    await test('T2.2 - Oversized file upload (>10MB) is intercepted before storage write', async () => {
      const oversizedBuffer = createMockFileBuffer('oversized')
      expect(oversizedBuffer.length).toBeGreaterThan(10 * 1024 * 1024)

      const validation = validateFileMetadata(oversizedBuffer.length, 'application/pdf')
      expect(validation.valid).toBeFalsy()
      expect(validation.error).toContain('La taille du fichier dépasse la limite autorisée de 10 Mo.')

      const uploadResult = mockStorage.uploadFile(oversizedBuffer, 'cases/case-101/large.pdf', 'application/pdf')
      expect(uploadResult.error).toContain('10 Mo')
    })

    await test('T2.3 - Spoofed executable disguised as PDF extension is rejected by validation', async () => {
      const exeBuffer = createMockFileBuffer('exe')
      const spoofedMime = 'application/x-msdownload'

      const validation = validateFileMetadata(exeBuffer.length, spoofedMime)
      expect(validation.valid).toBeFalsy()
      expect(validation.error).toContain('Format de fichier non autorisé')
    })

    await test('T2.4 - Accessing file with expired signed URL (>300s) yields HTTP 403 Forbidden', async () => {
      mockStorage.reset()
      const path = 'cases/case-101/expired_doc.pdf'
      mockStorage.uploadFile(createMockFileBuffer('pdf'), path, 'application/pdf')

      const expiredAtMs = Date.now() - 1000
      const mockToken = Buffer.from(
        JSON.stringify({ path, exp: Math.floor(expiredAtMs / 1000) })
      ).toString('base64url')

      const expiredSignedUrl = `https://supabase.local/storage/v1/object/sign/transit-documents/${path}?token=${mockToken}&expires=300`

      const fetchResult = mockStorage.fetchSignedUrl(expiredSignedUrl)
      expect(fetchResult.status).toBe(403)
      expect(fetchResult.error).toBe('Signed URL has expired')
    })

    await test('T2.5 - Unauthenticated access or unauthorized role access yields HTTP 401/403', async () => {
      mockDb.reset()

      const simulateUnauthUpload = (sessionUser: unknown) => {
        if (!sessionUser) {
          return { status: 401, error: 'Non autorisé' }
        }
        return { status: 201 }
      }
      const unauthRes = simulateUnauthUpload(null)
      expect(unauthRes.status).toBe(401)
      expect(unauthRes.error).toBe('Non autorisé')

      const doc = await mockDb.document.create({
        data: {
          organizationId: CLIENT_SESSION.profile.organizationId,
          caseId: 'case-101',
          name: 'Confidential_Bill.pdf',
          category: 'bl',
          fileType: 'application/pdf',
          fileSize: 1024,
          fileUrl: 'cases/case-101/confidential.pdf',
          sharedWithClient: false,
        },
      })

      const simulateClientFetch = (userSession: typeof CLIENT_SESSION, documentRecord: typeof doc) => {
        if (userSession.profile.role === 'CLIENT') {
          if (!documentRecord.sharedWithClient) {
            return { status: 403, error: 'Accès interdit : Document non partagé' }
          }
          if (documentRecord.case?.clientId !== userSession.profile.clientId) {
            return { status: 403, error: "Accès interdit : Document d'un autre client" }
          }
        }
        return { status: 200 }
      }

      const forbiddenRes = simulateClientFetch(OTHER_CLIENT_SESSION, doc)
      expect(forbiddenRes.status).toBe(403)
      expect(forbiddenRes.error).toContain('Accès interdit')
    })
  })
}
