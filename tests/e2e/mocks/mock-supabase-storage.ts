/**
 * Mock Supabase Storage Implementation for E2E Tests
 * Simulates private storage bucket `transit-documents` operations:
 * - File upload to isolated in-memory buffer store
 * - Short-lived signed URL generation (300s default expiry)
 * - File removal / cleanup
 * - Content header & permission verification
 */

export const MOCK_BUCKET_NAME = 'transit-documents'
export const MOCK_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MOCK_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

export interface StoredFile {
  path: string
  buffer: Buffer
  contentType: string
  size: number
  uploadedAt: number
}

class MockSupabaseStorageService {
  private store: Map<string, StoredFile> = new Map()

  /**
   * Clears all stored files from in-memory mock storage.
   */
  public reset(): void {
    this.store.clear()
  }

  /**
   * Sanitizes relative storage path.
   */
  public sanitizePath(path: string): string {
    return path.replace(/^\/+/, '').trim()
  }

  /**
   * Uploads file buffer to mock Supabase Storage bucket.
   */
  public uploadFile(
    fileBuffer: Buffer,
    relativePath: string,
    contentType: string
  ): { fileUrl: string; error: string | null } {
    const cleanPath = this.sanitizePath(relativePath)

    if (fileBuffer.length === 0) {
      return { fileUrl: cleanPath, error: 'Fichier vide (0 octet).' }
    }

    if (fileBuffer.length > MOCK_MAX_FILE_SIZE_BYTES) {
      return {
        fileUrl: cleanPath,
        error: 'La taille du fichier dépasse la limite autorisée de 10 Mo.',
      }
    }

    const normalizedMime = contentType.toLowerCase()
    if (!MOCK_ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      return {
        fileUrl: cleanPath,
        error: 'Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPG.',
      }
    }

    this.store.set(cleanPath, {
      path: cleanPath,
      buffer: fileBuffer,
      contentType: normalizedMime,
      size: fileBuffer.length,
      uploadedAt: Date.now(),
    })

    return { fileUrl: cleanPath, error: null }
  }

  /**
   * Generates temporary signed preview URL.
   */
  public generateSignedUrl(
    fileUrl: string,
    expiresInSeconds: number = 300
  ): { signedUrl: string | null; expiresAt: string | null; error: string | null } {
    const cleanPath = this.sanitizePath(fileUrl)

    // Check if file exists in mock store or matches expected path structure
    const stored = this.store.get(cleanPath)

    // If not physically present in mock store but has valid path structure, allow for URL test doubles
    const pathIsValid = cleanPath.startsWith('cases/') || cleanPath.startsWith('documents/')
    if (!stored && !pathIsValid) {
      return {
        signedUrl: null,
        expiresAt: null,
        error: `Object '${cleanPath}' not found in bucket '${MOCK_BUCKET_NAME}'`,
      }
    }

    const expiresAtMs = Date.now() + expiresInSeconds * 1000
    const expiresAtIso = new Date(expiresAtMs).toISOString()

    const mockToken = Buffer.from(
      JSON.stringify({ path: cleanPath, exp: Math.floor(expiresAtMs / 1000) })
    ).toString('base64url')

    const signedUrl = `https://supabase.local/storage/v1/object/sign/${MOCK_BUCKET_NAME}/${cleanPath}?token=${mockToken}&expires=${expiresInSeconds}`

    return {
      signedUrl,
      expiresAt: expiresAtIso,
      error: null,
    }
  }

  /**
   * Simulates fetching an object via a signed URL.
   */
  public fetchSignedUrl(signedUrl: string): {
    status: number
    contentType?: string
    buffer?: Buffer
    error?: string
  } {
    try {
      const urlObj = new URL(signedUrl)
      const token = urlObj.searchParams.get('token')
      const expiresParam = urlObj.searchParams.get('expires')

      if (!token || !expiresParam) {
        return { status: 403, error: 'Missing security token' }
      }

      const decodedToken = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
      if (decodedToken.exp * 1000 < Date.now()) {
        return { status: 403, error: 'Signed URL has expired' }
      }

      const cleanPath = decodedToken.path
      const stored = this.store.get(cleanPath)
      if (!stored) {
        // Return simulated content if path valid
        return {
          status: 200,
          contentType: cleanPath.endsWith('.pdf') ? 'application/pdf' : 'image/png',
          buffer: Buffer.from('%PDF-1.5 Mock Content'),
        }
      }

      return {
        status: 200,
        contentType: stored.contentType,
        buffer: stored.buffer,
      }
    } catch {
      return { status: 400, error: 'Invalid signed URL format' }
    }
  }

  /**
   * Deletes a file from mock storage.
   */
  public deleteFile(fileUrl: string): { success: boolean; error: string | null } {
    const cleanPath = this.sanitizePath(fileUrl)
    const exists = this.store.has(cleanPath)
    this.store.delete(cleanPath)
    return { success: true, error: exists ? null : 'File not found' }
  }

  /**
   * Checks if file exists in mock storage.
   */
  public hasFile(fileUrl: string): boolean {
    return this.store.has(this.sanitizePath(fileUrl))
  }

  /**
   * Retrieves file details from mock storage.
   */
  public getFile(fileUrl: string): StoredFile | undefined {
    return this.store.get(this.sanitizePath(fileUrl))
  }
}

export const mockStorage = new MockSupabaseStorageService()
