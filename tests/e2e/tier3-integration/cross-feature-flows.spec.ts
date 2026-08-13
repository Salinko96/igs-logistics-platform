/**
 * Tier 3: Cross-Feature Integration Test Suite
 * Tests:
 * - T3.1: Full Document Lifecycle Flow (Upload -> DB persist -> Signed URL -> Preview Sheet flow)
 * - T3.2: Multi-Case Multi-Document Path Isolation & Tenant Security Flow
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockStorage } from '../mocks/mock-supabase-storage'
import { mockDb } from '../mocks/mock-prisma'
import { createMockFileBuffer, ADMIN_SESSION, CLIENT_SESSION } from '../helpers/test-fixtures'

export async function runTier3IntegrationTests(): Promise<void> {
  await describe('Tier 3: Cross-Feature Integration Flows', async () => {
    await test('T3.1 - Full Document Lifecycle: Dropzone upload -> Supabase Storage write -> Prisma DB record -> Signed URL -> Viewer Sheet inline rendering', async () => {
      mockDb.reset()
      mockStorage.reset()

      const originalFilename = 'Bill_of_Lading_SN_2026.pdf'
      const mimeType = 'application/pdf'
      const pdfBuffer = createMockFileBuffer('pdf')

      const timestamp = 1770598888888
      const storageKey = `cases/case-101/${timestamp}_${originalFilename}`
      const uploadRes = mockStorage.uploadFile(pdfBuffer, storageKey, mimeType)

      expect(uploadRes.error).toBeNull()
      expect(uploadRes.fileUrl).toBe(storageKey)
      expect(mockStorage.hasFile(storageKey)).toBeTruthy()

      const dbDoc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: 'case-101',
          name: originalFilename,
          category: 'bl',
          fileType: mimeType,
          fileSize: pdfBuffer.length,
          fileUrl: uploadRes.fileUrl,
          status: 'recu',
          sharedWithClient: true,
          uploadedById: ADMIN_SESSION.profile.id,
        },
      })

      expect(dbDoc.id).toBeTruthy()
      expect(dbDoc.fileUrl).toBe(storageKey)
      expect(dbDoc.fileSize).toBe(pdfBuffer.length)
      expect(dbDoc.fileType).toBe(mimeType)

      const { signedUrl, expiresAt, error: signedUrlErr } = mockStorage.generateSignedUrl(dbDoc.fileUrl!, 300)

      expect(signedUrlErr).toBeNull()
      expect(signedUrl).toBeTruthy()
      expect(signedUrl).toContain('token=')
      expect(expiresAt).toBeTruthy()

      const sheetViewState = {
        isOpen: true,
        document: dbDoc,
        signedUrl,
        previewElement: dbDoc.fileType === 'application/pdf' ? 'iframe' : 'img',
      }

      expect(sheetViewState.isOpen).toBeTruthy()
      expect(sheetViewState.previewElement).toBe('iframe')
      expect(sheetViewState.signedUrl).toBe(signedUrl)

      const objectRes = mockStorage.fetchSignedUrl(signedUrl!)
      expect(objectRes.status).toBe(200)
      expect(objectRes.contentType).toBe('application/pdf')
    })

    await test('T3.2 - Multi-Case Multi-Document Isolation Flow: Independent storage paths, DB relations, and signed URL access', async () => {
      mockDb.reset()
      mockStorage.reset()

      const pathA = 'cases/case-101/1770599999999_Doc_Case_A.pdf'
      const bufA = createMockFileBuffer('pdf')
      mockStorage.uploadFile(bufA, pathA, 'application/pdf')

      const docA = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: 'case-101',
          name: 'Doc_Case_A.pdf',
          category: 'declaration',
          fileType: 'application/pdf',
          fileSize: bufA.length,
          fileUrl: pathA,
          sharedWithClient: true,
        },
      })

      const pathB = 'cases/case-102/1770599999999_Doc_Case_B.png'
      const bufB = createMockFileBuffer('png')
      mockStorage.uploadFile(bufB, pathB, 'image/png')

      const docB = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: 'case-102',
          name: 'Doc_Case_B.png',
          category: 'facture_commerciale',
          fileType: 'image/png',
          fileSize: bufB.length,
          fileUrl: pathB,
          sharedWithClient: false,
        },
      })

      expect(docA.fileUrl?.startsWith('cases/case-101/')).toBeTruthy()
      expect(docB.fileUrl?.startsWith('cases/case-102/')).toBeTruthy()
      expect(docA.fileUrl !== docB.fileUrl).toBeTruthy()

      expect(docA.caseId).toBe('case-101')
      expect(docA.case?.reference).toBe('DOS-2026-001')
      expect(docB.caseId).toBe('case-102')
      expect(docB.case?.reference).toBe('DOS-2026-002')

      const signedUrlA = mockStorage.generateSignedUrl(docA.fileUrl!, 300)
      const signedUrlB = mockStorage.generateSignedUrl(docB.fileUrl!, 300)

      expect(signedUrlA.signedUrl).toBeTruthy()
      expect(signedUrlB.signedUrl).toBeTruthy()

      const canAccessA = CLIENT_SESSION.profile.clientId === docA.case?.clientId && docA.sharedWithClient
      expect(canAccessA).toBeTruthy()

      const canAccessB = CLIENT_SESSION.profile.clientId === docB.case?.clientId && docB.sharedWithClient
      expect(canAccessB).toBeFalsy()
    })
  })
}
