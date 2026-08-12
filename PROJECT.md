# Project: ISS Transit Documents Storage & Viewer

## Architecture
- Framework: Next.js 16.1.1 App Router + React 19 + TypeScript + Tailwind CSS v4
- Storage: Private Supabase Storage bucket `transit-documents` with short-lived server-generated signed URLs (300s)
- Database: PostgreSQL on Supabase + Prisma ORM (`Document` model)
- State & Data Fetching: Zustand store (`src/lib/store.ts`), TanStack React Query (`@tanstack/react-query`)
- UI Components: FileUploadDropzone (Drag & Drop + progress + validation), DocumentViewerSheet (Sheet drawer for PDF/Images), integrated into DocumentsView (`src/components/documents/documents-view.tsx`), CaseDetail (`src/components/dossiers/case-detail.tsx`), and Client Portal (`src/app/portail/page.tsx`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Drag & Drop UI | Reusable Drag & Drop file upload component with real-time progress bar and MIME/size validation | M1 | R1 / Survey |
| 2 | R2: Private Storage | Bucket creation/config `transit-documents`, storage key structure `/cases/{caseId}/{timestamp}_{filename}`, and signed URL API endpoint | M1 | R2 / Survey |
| 3 | R3: DB Persistence | DB persistence of `fileUrl`, `fileSize`, `fileType` via Prisma API | M2 | R3 / Survey |
| 4 | R4: File Viewer Sheet | Side-panel Sheet / Modal viewer for inline PDF iframe and PNG/JPG images without forced download | M2 | R4 / Survey |
| 5 | E2E & Validation | Full end-to-end test suite and verification across Tiers 1-4 | M-E2E | Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|-------------|--------|---------|
| 1 | M1: Storage & Component | Private Supabase Storage bucket (`transit-documents`), signed URL API route (`/api/documents/[id]/signed-url`), upload route (`/api/documents/upload`), and `FileUploadDropzone` component | none | IN_PROGRESS | 19fa0ab6-bf5d-4503-a317-930ea64183f1 |
| 2 | M2: Integration & DB | Integrate upload and signed URL document viewer into `DocumentsView`, `CaseDetail`, and `ClientPortal`, and persist document metadata (`fileUrl`, `fileSize`, `fileType`) in Prisma DB | M1 | PLANNED | - |
| 3 | M-E2E: E2E Test Suite | Build automated test harness and unit/integration/E2E test suite covering Tiers 1-4 for all features | M1, M2 | IN_PROGRESS | 5611a5d9-449a-4b74-a540-f28fd563590d |

## Interface Contracts
### Supabase Storage API ↔ Next.js Server
- Bucket: `transit-documents` (private)
- Storage Path: `/cases/{caseId}/{timestamp}_{filename}` or `/documents/general/{timestamp}_{filename}`
- Signed URL API: `GET /api/documents/[id]/signed-url` -> returns `{ signedUrl: string, expiresAt: string }`
- Upload Endpoint: `POST /api/documents/upload` -> accepts multipart form data or handles storage upload & metadata extraction -> returns `{ fileUrl, fileSize, fileType, name }`

### API ↔ Prisma Database
- `POST /api/documents`: Payload `{ name, category, caseId, fileUrl, fileSize, fileType, sharedWithClient, notes }`
- `Document` record created with status `recu` or `conforme`.

## Code Layout
- `src/lib/storage/supabase-storage.ts`: Server-side Supabase storage helper functions (bucket check, upload file, create signed URL).
- `src/app/api/documents/[id]/signed-url/route.ts`: API route for fetching temporary signed preview URL.
- `src/app/api/documents/upload/route.ts`: API route for secure file upload to Supabase Storage bucket.
- `src/components/documents/file-upload-dropzone.tsx`: Drag & Drop upload component with progress bar and file validation.
- `src/components/documents/document-viewer-sheet.tsx`: Document preview Sheet drawer for PDF and images.
- `src/components/documents/documents-view.tsx`: Updated documents management view.
- `src/components/dossiers/case-detail.tsx`: Updated case details view with dropzone and viewer.
- `src/app/portail/page.tsx`: Updated client portal with document preview viewer.
