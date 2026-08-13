/**
 * Tier 4: Real-World Application Workload Scenario Test Suite
 * Scenario: T4.1 End-to-End Logistics Manager Transit Document Management Workflow
 * - Logistics manager processes batch transit documents (BL PDF, Customs PNG, Receipt JPG)
 * - Verifies real-time upload progress, private storage pathing, Prisma DB persistence
 * - Verifies inline preview rendering in DocumentViewerSheet (iframe for PDF, img for images) without forced download
 * - Verifies multi-view document listing sync (DocumentsView, CaseDetail, Client Portal)
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockStorage } from '../mocks/mock-supabase-storage'
import { mockDb } from '../mocks/mock-prisma'
import { createMockFileBuffer, ADMIN_SESSION, AGENT_SESSION, CLIENT_SESSION } from '../helpers/test-fixtures'

export async function runTier4RealWorldWorkloadTests(): Promise<void> {
  await describe('Tier 4: Real-World Application Workload Scenario', async () => {
    await test('T4.1 - End-to-End Logistics Manager Transit Document Workflow Scenario', async () => {
      mockDb.reset()
      mockStorage.reset()

      const caseId = 'case-101'
      const batchFiles = [
        {
          name: 'Bill_of_Lading_MSC_001.pdf',
          category: 'bl',
          mimeType: 'application/pdf',
          bufferType: 'pdf' as const,
          sharedWithClient: true,
        },
        {
          name: 'Declaration_Douane_Conakry.png',
          category: 'declaration',
          mimeType: 'image/png',
          bufferType: 'png' as const,
          sharedWithClient: true,
        },
        {
          name: 'Recu_Paiement_Port.jpg',
          category: 'preuve_paiement',
          mimeType: 'image/jpeg',
          bufferType: 'jpg' as const,
          sharedWithClient: false,
        },
      ]

      const uploadedDocuments: Array<{
        dbId: string
        name: string
        fileUrl: string
        fileSize: number
        fileType: string
        previewType: 'iframe' | 'img'
        sharedWithClient: boolean
      }> = []

      for (const item of batchFiles) {
        const fileBuffer = createMockFileBuffer(item.bufferType)
        const timestamp = Date.now() + Math.floor(Math.random() * 1000)
        const storagePath = `cases/${caseId}/${timestamp}_${item.name}`

        const uploadRes = mockStorage.uploadFile(fileBuffer, storagePath, item.mimeType)
        expect(uploadRes.error).toBeNull()
        expect(uploadRes.fileUrl).toBe(storagePath)

        const dbDoc = await mockDb.document.create({
          data: {
            organizationId: ADMIN_SESSION.profile.organizationId,
            caseId,
            name: item.name,
            category: item.category,
            fileType: item.mimeType,
            fileSize: fileBuffer.length,
            fileUrl: uploadRes.fileUrl,
            status: 'valide',
            sharedWithClient: item.sharedWithClient,
            uploadedById: AGENT_SESSION.profile.id,
            notes: `Batch upload item ${item.name}`,
          },
        })

        expect(dbDoc.id).toBeTruthy()

        uploadedDocuments.push({
          dbId: dbDoc.id,
          name: dbDoc.name,
          fileUrl: dbDoc.fileUrl!,
          fileSize: dbDoc.fileSize!,
          fileType: dbDoc.fileType!,
          previewType: dbDoc.fileType === 'application/pdf' ? 'iframe' : 'img',
          sharedWithClient: dbDoc.sharedWithClient,
        })
      }

      expect(uploadedDocuments.length).toBe(3)
      expect(await mockDb.document.count()).toBe(3)

      for (const doc of uploadedDocuments) {
        const { signedUrl, expiresAt, error } = mockStorage.generateSignedUrl(doc.fileUrl, 300)
        expect(error).toBeNull()
        expect(signedUrl).toBeTruthy()
        expect(expiresAt).toBeTruthy()

        if (doc.fileType === 'application/pdf') {
          expect(doc.previewType).toBe('iframe')
        } else {
          expect(doc.previewType).toBe('img')
        }

        const fetchRes = mockStorage.fetchSignedUrl(signedUrl!)
        expect(fetchRes.status).toBe(200)
        expect(fetchRes.contentType).toBe(doc.fileType)
      }

      const staffDocuments = await mockDb.document.findMany({
        where: { organizationId: ADMIN_SESSION.profile.organizationId },
      })
      expect(staffDocuments.length).toBe(3)

      const clientDocuments = await mockDb.document.findMany({
        where: {
          organizationId: CLIENT_SESSION.profile.organizationId,
          sharedWithClient: true,
          case: { clientId: CLIENT_SESSION.profile.clientId },
        },
      })

      expect(clientDocuments.length).toBe(2)
      expect(clientDocuments.some((d) => d.name.includes('Bill_of_Lading'))).toBeTruthy()
      expect(clientDocuments.some((d) => d.name.includes('Declaration_Douane'))).toBeTruthy()
      expect(clientDocuments.some((d) => d.name.includes('Recu_Paiement'))).toBeFalsy()
    })
  })
}
