# E2E Test Infra: ISS Transit Documents Storage & Viewer

## Test Philosophy
- Opaque-box, requirement-driven. No direct dependency on internal state where public API / UI actions exist.
- Coverage of Requirements R1 (Drag & Drop UI), R2 (Supabase Storage Privé & Signed URLs), R3 (Prisma DB Persistence), R4 (Integrated File Viewer Sheet).
- Methodology: 4-Tier test architecture (Category-Partition + Boundary Value Analysis + Pairwise + Real-World Workload).

## Feature Inventory & Requirements
| # | Feature | Requirements Source | Tier 1 Goals | Tier 2 Goals | Tier 3 | Tier 4 |
|---|---------|---------------------|:------------:|:------------:|:------:|:------:|
| 1 | R1: Drag & Drop Upload Component | ORIGINAL_REQUEST §R1 | ≥5 cases | Corner cases (empty, invalid format, max size) | ✓ | ✓ |
| 2 | R2: Private Storage & Signed URLs | ORIGINAL_REQUEST §R2 | ≥5 cases | Corner cases (expired URL, bucket path, direct access block) | ✓ | ✓ |
| 3 | R3: DB Persistence via Prisma | ORIGINAL_REQUEST §R3 | ≥5 cases | Corner cases (missing fields, duplicate names, zero bytes) | ✓ | ✓ |
| 4 | R4: Integrated File Viewer Sheet | ORIGINAL_REQUEST §R4 | ≥5 cases | Corner cases (unsupported format, sheet state, pdf vs img) | ✓ | ✓ |

## Test Architecture
- Test Runner: Vitest / Jest / Playwright or Node test runner executing component and API tests against endpoints and database.
- Test Files Location: `tests/e2e/` (or `__tests__/e2e/`)
- Verification Channels: API HTTP response status codes, payload structures, Prisma database state assertions, and UI component render outputs.

## Test Tiers Breakdown

### Tier 1: Feature Coverage (≥5 per feature, total ≥20 test cases)

#### Feature R1: Premium Drag & Drop Upload Component
- R1.1: Component accepts file selection and drag-and-drop dropzone events.
- R1.2: Progress indicator updates dynamically during file upload.
- R1.3: Allowed file formats (PDF, PNG, JPG, JPEG) are accepted.
- R1.4: Disallowed file formats (e.g. .exe, .sh, .txt) are rejected with validation error message.
- R1.5: File size validation enforces maximum size limit (e.g., max 10MB).

#### Feature R2: Supabase Storage Privé & Signed URLs
- R2.1: Files are uploaded physically to private bucket `transit-documents` under organized path `/cases/{caseId}/{timestamp}_{filename}` or `/documents/general/{timestamp}_{filename}`.
- R2.2: Direct unauthenticated public bucket URL requests are blocked / restricted.
- R2.3: Signed URL endpoint `/api/documents/[id]/signed-url` returns HTTP 200 with valid temporary signed URL.
- R2.4: Generated signed URLs include expiry parameters (`token`/`expires`) defaulting to temporary access (300s).
- R2.5: Valid signed URL fetches document with correct Content-Type header (application/pdf, image/png, image/jpeg).

#### Feature R3: Enregistrement en Base de Données (Prisma DB Persistence)
- R3.1: Successful upload persists a `Document` record in the database using Prisma API.
- R3.2: Persisted `fileUrl` stores the relative storage path/key in `transit-documents`.
- R3.3: Persisted `fileSize` matches exact file size in bytes.
- R3.4: Persisted `fileType` matches correct MIME type.
- R3.5: Document record links correctly to specified `caseId` when provided.

#### Feature R4: Integrated File Viewer Sheet (Aperçu)
- R4.1: Preview action button (Eye/Aperçu) renders adjacent to documents in document list views (`DocumentsView`, `CaseDetail`, `ClientPortal`).
- R4.2: Clicking preview button opens DocumentViewerSheet side panel / modal.
- R4.3: DocumentViewerSheet displays PDF documents inside inline preview iframe frame.
- R4.4: DocumentViewerSheet displays PNG/JPG image documents inside image preview element.
- R4.5: Closing DocumentViewerSheet dismisses side panel and clears preview URL state without forcing file download.

### Tier 2: Boundary & Corner Cases (≥5 per feature)
- T2.1: Empty file upload (0 bytes) is rejected with error.
- T2.2: Oversized file upload (>10MB limit) is intercepted before storage processing.
- T2.3: Corrupted or mismatched MIME extension (e.g. script renamed to .pdf) triggers validation rejection.
- T2.4: Accessing expired or invalid signed URL yields HTTP 403 Forbidden / Expired response.
- T2.5: Unauthenticated access to `/api/documents/upload` or `/api/documents/[id]/signed-url` yields HTTP 401/403.

### Tier 3: Cross-Feature Combinations (Pairwise Integration)
- T3.1: Full Document Lifecycle Flow: Drag & Drop upload file -> verify Supabase private storage write -> verify Prisma DB record persistence -> fetch signed URL -> verify inline preview rendering in DocumentViewerSheet.
- T3.2: Multi-Case Multi-Document Isolation Flow: Upload distinct documents across different case IDs, verifying path isolation in storage (`/cases/{caseId}/...`), correct foreign key linking in DB, and independent signed URL resolution.

### Tier 4: Real-World Application Scenarios
- T4.1: End-to-End User Transit Document Transit Management Scenario: A logistics manager uploads a batch of transit documents (Bill of Lading PDF, Customs Declaration PNG, Delivery Receipt JPG) for a transit case; verifies upload status indicators, DB metadata persistence, signed URL generation, inline side-panel preview for each file type without downloading, and document list updates across client portal and case view.

## Pass / Fail Criteria
- 100% test pass rate across all test cases (Tiers 1-4).
- Exit code 0 on running test command.
- Verification compliance with acceptance criteria in `ORIGINAL_REQUEST.md`.
