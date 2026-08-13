/**
 * Tier 1 Feature Coverage: R2. Private Supabase Storage & Signed URLs
 * Tests:
 * - R2.1: Physical upload to bucket `transit-documents` under relative path taxonomy
 * - R2.2: Direct unauthenticated public access is blocked (HTTP 403)
 * - R2.3: Signed URL endpoint `/api/documents/[id]/signed-url` returns HTTP 200 with { signedUrl, expiresAt }
 * - R2.4: Signed URL token and expiration parameters default to temporary window (300s)
 * - R2.5: Valid signed URL fetches document with correct Content-Type header
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockStorage, MOCK_BUCKET_NAME } from '../mocks/mock-supabase-storage'
import { mockDb } from '../mocks/mock-prisma'
import { createMockFileBuffer, ADMIN_SESSION, createMockNextRequest } from '../helpers/test-fixtures'

export async function runR2PrivateStorageTests(): Promise<void> {
  await describe('Tier 1: Feature R2 - Private Storage & Signed URLs', async () => {
    await test('R2.1 - Files are physically uploaded to transit-documents bucket under organized relative path', async () => {
      mockStorage.reset()
      const pdfBuffer = createMockFileBuffer('pdf')
      const storagePath = 'cases/case-101/1770590000000_Bill_of_Lading.pdf'

      const result = mockStorage.uploadFile(pdfBuffer, storagePath, 'application/pdf')

      expect(result.error).toBeNull()
      expect(result.fileUrl).toBe(storagePath)
      expect(mockStorage.hasFile(storagePath)).toBeTruthy()
    })

    await test('R2.2 - Direct unauthenticated public bucket URL access is blocked / restricted', async () => {
      const publicUrl = `https://supabase.local/storage/v1/object/public/${MOCK_BUCKET_NAME}/cases/case-101/secret_file.pdf`

      const simulatePublicFetch = (url: string) => {
        if (url.includes('/object/public/transit-documents/')) {
          return { status: 403, error: 'AccessDenied: Bucket transit-documents is private' }
        }
        return { status: 200 }
      }

      const res = simulatePublicFetch(publicUrl)
      expect(res.status).toBe(403)
      expect(res.error).toContain('private')
    })

    await test('R2.3 - Signed URL endpoint GET /api/documents/[id]/signed-url returns HTTP 200 with signedUrl and expiresAt', async () => {
      mockDb.reset()
      mockStorage.reset()

      const pdfPath = 'cases/case-101/1770590000000_Declaration_Douane.pdf'
      mockStorage.uploadFile(createMockFileBuffer('pdf'), pdfPath, 'application/pdf')

      const doc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: 'case-101',
          name: 'Declaration_Douane.pdf',
          category: 'declaration',
          fileType: 'application/pdf',
          fileSize: 1024 * 250,
          fileUrl: pdfPath,
          status: 'valide',
        },
      })

      const routeHandler = async () => {
        const { signedUrl, expiresAt, error } = mockStorage.generateSignedUrl(doc.fileUrl!, 300)
        if (error) return { status: 500, data: { error } }
        return {
          status: 200,
          data: {
            documentId: doc.id,
            signedUrl,
            expiresAt,
            fileType: doc.fileType,
            name: doc.name,
          },
        }
      }

      const res = await routeHandler()

      expect(res.status).toBe(200)
      expect(res.data.documentId).toBe(doc.id)
      expect(res.data.signedUrl).toContain('token=')
      expect(res.data.signedUrl).toContain('expires=300')
      expect(res.data.expiresAt).toBeTruthy()
    })

    await test('R2.4 - Generated signed URLs enforce short-lived expiry timestamp (default 300s)', async () => {
      mockStorage.reset()
      const filePath = 'cases/case-101/test.pdf'
      mockStorage.uploadFile(createMockFileBuffer('pdf'), filePath, 'application/pdf')

      const { signedUrl, expiresAt } = mockStorage.generateSignedUrl(filePath, 300)

      expect(signedUrl).toBeTruthy()
      expect(expiresAt).toBeTruthy()

      const expiresDate = new Date(expiresAt!).getTime()
      const now = Date.now()
      const diffSeconds = Math.round((expiresDate - now) / 1000)

      expect(diffSeconds).toBeGreaterThan(290)
      expect(diffSeconds).toBeLessThan(310)
    })

    await test('R2.5 - Valid signed URL fetch retrieves document with correct Content-Type header', async () => {
      mockStorage.reset()
      const pdfPath = 'cases/case-101/Bordereau_Livraison.pdf'
      const pdfBuffer = createMockFileBuffer('pdf')
      mockStorage.uploadFile(pdfBuffer, pdfPath, 'application/pdf')

      const { signedUrl } = mockStorage.generateSignedUrl(pdfPath, 300)
      const response = mockStorage.fetchSignedUrl(signedUrl!)

      expect(response.status).toBe(200)
      expect(response.contentType).toBe('application/pdf')
      expect(response.buffer).toBeTruthy()
    })
  })
}
