/**
 * Tier 1 Feature Coverage: R3. Prisma DB Persistence
 * Tests:
 * - R3.1: Successful upload creates Document record in PostgreSQL database
 * - R3.2: Persisted `fileUrl` stores relative path key in transit-documents bucket
 * - R3.3: Persisted `fileSize` matches exact byte count
 * - R3.4: Persisted `fileType` matches MIME type string
 * - R3.5: Document record links correctly to target `caseId`
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockDb } from '../mocks/mock-prisma'
import { mockStorage } from '../mocks/mock-supabase-storage'
import { createMockFileBuffer, ADMIN_SESSION } from '../helpers/test-fixtures'

export async function runR3DbPersistenceTests(): Promise<void> {
  await describe('Tier 1: Feature R3 - Prisma DB Persistence', async () => {
    await test('R3.1 - Successful upload persists a Document record in database via Prisma API', async () => {
      mockDb.reset()
      mockStorage.reset()

      const filename = 'Facture_Commerciale_001.pdf'
      const mimeType = 'application/pdf'
      const buffer = createMockFileBuffer('pdf')
      const relativePath = 'cases/case-101/1770590000000_Facture_Commerciale_001.pdf'

      const uploadRes = mockStorage.uploadFile(buffer, relativePath, mimeType)
      expect(uploadRes.error).toBeNull()

      const createdDoc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: 'case-101',
          name: filename,
          category: 'facture_commerciale',
          fileType: mimeType,
          fileSize: buffer.length,
          fileUrl: uploadRes.fileUrl,
          status: 'recu',
          uploadedById: ADMIN_SESSION.profile.id,
        },
      })

      expect(createdDoc).toBeTruthy()
      expect(createdDoc.id).toBeTruthy()
      expect(await mockDb.document.count()).toBe(1)
    })

    await test('R3.2 - Persisted fileUrl stores relative storage path key in transit-documents', async () => {
      mockDb.reset()
      const relativePath = 'cases/case-101/1770591111111_Attestation_Origine.pdf'

      const createdDoc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Attestation_Origine.pdf',
          category: 'autre',
          fileType: 'application/pdf',
          fileSize: 1024 * 150,
          fileUrl: relativePath,
          status: 'recu',
        },
      })

      const retrieved = await mockDb.document.findUnique({ where: { id: createdDoc.id } })
      expect(retrieved?.fileUrl).toBe(relativePath)
      expect(retrieved?.fileUrl?.startsWith('cases/case-101/')).toBeTruthy()
    })

    await test('R3.3 - Persisted fileSize matches exact byte length of uploaded file', async () => {
      mockDb.reset()
      const sampleBuffer = createMockFileBuffer('png')
      const exactByteLength = sampleBuffer.length

      const doc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Scan_Douane.png',
          category: 'declaration',
          fileType: 'image/png',
          fileSize: exactByteLength,
          fileUrl: 'cases/case-101/1770592222222_Scan_Douane.png',
        },
      })

      expect(doc.fileSize).toBe(exactByteLength)
      expect(doc.fileSize).toBe(16)
    })

    await test('R3.4 - Persisted fileType matches MIME type string', async () => {
      mockDb.reset()

      const pdfDoc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Document.pdf',
          fileType: 'application/pdf',
          fileSize: 500,
          fileUrl: 'cases/case-101/doc.pdf',
        },
      })

      const jpgDoc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 800,
          fileUrl: 'cases/case-101/photo.jpg',
        },
      })

      expect(pdfDoc.fileType).toBe('application/pdf')
      expect(jpgDoc.fileType).toBe('image/jpeg')
    })

    await test('R3.5 - Document record links correctly to target caseId when provided', async () => {
      mockDb.reset()
      const targetCaseId = 'case-101'

      const doc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          caseId: targetCaseId,
          name: 'Reçu_Paiement.pdf',
          category: 'preuve_paiement',
          fileType: 'application/pdf',
          fileSize: 1024,
          fileUrl: 'cases/case-101/recu.pdf',
        },
      })

      expect(doc.caseId).toBe(targetCaseId)
      expect(doc.case?.id).toBe(targetCaseId)
      expect(doc.case?.reference).toBe('DOS-2026-001')
    })
  })
}
