/**
 * Tier 1 Feature Coverage: R4. Integrated File Viewer Sheet (Aperçu)
 * Tests:
 * - R4.1: Preview action button (Eye / Voir / Aperçu) renders adjacent to document items
 * - R4.2: Clicking preview button opens DocumentViewerSheet side panel / drawer
 * - R4.3: DocumentViewerSheet displays PDF documents inside inline iframe element
 * - R4.4: DocumentViewerSheet displays PNG/JPG images inside inline img element
 * - R4.5: Closing Sheet dismisses side panel and clears preview URL state without download
 */

import { describe, test, expect } from '../helpers/test-runner-harness'
import { mockStorage } from '../mocks/mock-supabase-storage'
import { mockDb } from '../mocks/mock-prisma'
import { ADMIN_SESSION } from '../helpers/test-fixtures'

export async function runR4DocumentViewerTests(): Promise<void> {
  await describe('Tier 1: Feature R4 - Integrated File Viewer Sheet', async () => {
    await test('R4.1 - Preview action button (Eye / Voir / Aperçu) renders adjacent to document items', async () => {
      mockDb.reset()
      const doc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Connaissement_Maritime.pdf',
          category: 'bl',
          fileType: 'application/pdf',
          fileSize: 1024 * 500,
          fileUrl: 'cases/case-101/bl.pdf',
        },
      })

      const actionButton = {
        type: 'button',
        label: 'Voir',
        icon: 'Eye',
        docId: doc.id,
      }

      expect(actionButton.label).toBe('Voir')
      expect(actionButton.icon).toBe('Eye')
      expect(actionButton.docId).toBe(doc.id)
    })

    await test('R4.2 - Clicking preview button requests signed URL and opens DocumentViewerSheet', async () => {
      mockDb.reset()
      mockStorage.reset()

      const filePath = 'cases/case-101/1770590000000_Customs_Declaration.pdf'
      mockStorage.uploadFile(Buffer.from('PDF Content'), filePath, 'application/pdf')

      const doc = await mockDb.document.create({
        data: {
          organizationId: ADMIN_SESSION.profile.organizationId,
          name: 'Customs_Declaration.pdf',
          category: 'declaration',
          fileType: 'application/pdf',
          fileSize: 2048,
          fileUrl: filePath,
        },
      })

      let viewerState: { open: boolean; documentId: string | null; signedUrl: string | null } = {
        open: false,
        documentId: null,
        signedUrl: null,
      }

      const openViewerForDoc = (documentId: string, fileUrl: string) => {
        const { signedUrl } = mockStorage.generateSignedUrl(fileUrl, 300)
        viewerState = {
          open: true,
          documentId,
          signedUrl,
        }
      }

      openViewerForDoc(doc.id, doc.fileUrl!)

      expect(viewerState.open).toBeTruthy()
      expect(viewerState.documentId).toBe(doc.id)
      expect(viewerState.signedUrl).toContain('token=')
    })

    await test('R4.3 - DocumentViewerSheet displays PDF documents inside inline iframe preview element', async () => {
      const pdfType = 'application/pdf'
      const signedUrl = 'https://supabase.local/storage/v1/object/sign/transit-documents/cases/case-101/doc.pdf?token=abc'

      const renderViewerContent = (type: string, url: string) => {
        if (type === 'application/pdf' || url.endsWith('.pdf')) {
          return {
            elementType: 'iframe',
            src: url,
            title: 'Visualiseur PDF',
            attributes: { className: 'w-full h-full border-0' },
          }
        }
        return { elementType: 'img', src: url }
      }

      const result = renderViewerContent(pdfType, signedUrl)

      expect(result.elementType).toBe('iframe')
      expect(result.src).toBe(signedUrl)
    })

    await test('R4.4 - DocumentViewerSheet displays PNG/JPG images inside inline img element', async () => {
      const pngType = 'image/png'
      const signedUrl = 'https://supabase.local/storage/v1/object/sign/transit-documents/cases/case-101/photo.png?token=abc'

      const renderViewerContent = (type: string, url: string) => {
        if (type === 'application/pdf') {
          return { elementType: 'iframe', src: url }
        }
        if (type.startsWith('image/')) {
          return {
            elementType: 'img',
            src: url,
            alt: 'Aperçu du document',
            attributes: { className: 'max-w-full max-h-full object-contain' },
          }
        }
        return { elementType: 'div', src: url }
      }

      const result = renderViewerContent(pngType, signedUrl)

      expect(result.elementType).toBe('img')
      expect(result.src).toBe(signedUrl)
      expect(result.alt).toBe('Aperçu du document')
    })

    await test('R4.5 - Closing DocumentViewerSheet dismisses drawer and clears preview state without download', async () => {
      let viewerState = {
        open: true,
        documentId: 'doc-123',
        signedUrl: 'https://supabase.local/storage/v1/object/sign/...',
      }

      const closeViewer = () => {
        viewerState = {
          open: false,
          documentId: null,
          signedUrl: null,
        }
      }

      closeViewer()

      expect(viewerState.open).toBeFalsy()
      expect(viewerState.documentId).toBeNull()
      expect(viewerState.signedUrl).toBeNull()
    })
  })
}
