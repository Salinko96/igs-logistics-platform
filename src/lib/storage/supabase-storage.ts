import { createAdminClient } from '@/lib/supabase/server'

export const BUCKET_NAME = 'transit-documents'
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

/**
 * Normalizes a storage path by removing leading slashes and redundant spaces.
 */
export function sanitizeStoragePath(path: string): string {
  return path.replace(/^\/+/, '').trim()
}

/**
 * Validates file size and MIME type.
 */
export function validateFileMetadata(size: number, mimeType: string): { valid: boolean; error?: string } {
  if (size <= 0) {
    return { valid: false, error: 'Fichier vide (0 octet).' }
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'La taille du fichier dépasse la limite autorisée de 10 Mo.' }
  }
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())
  if (!isAllowedMime) {
    return { valid: false, error: 'Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPG.' }
  }
  return { valid: true }
}

/**
 * Ensures that the private storage bucket `transit-documents` exists on Supabase.
 */
export async function ensureTransitDocumentsBucket() {
  const supabase = createAdminClient()
  try {
    const { data: bucket, error: getError } = await supabase.storage.getBucket(BUCKET_NAME)
    if (getError || !bucket) {
      const { data: createdBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      })
      if (createError) {
        console.warn(`Could not create bucket '${BUCKET_NAME}':`, createError.message)
        return false
      }
      return !!createdBucket
    }
    return true
  } catch (err) {
    console.warn(`Error ensuring bucket '${BUCKET_NAME}':`, err)
    return false
  }
}

/**
 * Uploads a file buffer or Blob to Supabase Storage.
 * Relative path format: `cases/{caseId}/{timestamp}_{filename}` or `documents/general/{timestamp}_{filename}`
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer | ArrayBuffer | Blob,
  relativePath: string,
  contentType: string
): Promise<{ fileUrl: string; error: string | null }> {
  const cleanPath = sanitizeStoragePath(relativePath)
  const supabase = createAdminClient()

  await ensureTransitDocumentsBucket()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(cleanPath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error(`Error uploading to storage path ${cleanPath}:`, error)
    return { fileUrl: cleanPath, error: error.message }
  }

  return { fileUrl: data?.path || cleanPath, error: null }
}

/**
 * Generates a temporary signed URL (default 300 seconds = 5 minutes) for a document.
 */
export async function generateSignedUrl(
  fileUrl: string,
  expiresIn: number = 300
): Promise<{ signedUrl: string | null; expiresAt: string | null; error: string | null }> {
  const cleanPath = sanitizeStoragePath(fileUrl)
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(cleanPath, expiresIn)

  if (error || !data?.signedUrl) {
    console.error(`Error generating signed URL for ${cleanPath}:`, error?.message)
    return { signedUrl: null, expiresAt: null, error: error?.message || 'Signed URL generation failed' }
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  return { signedUrl: data.signedUrl, expiresAt, error: null }
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteFileFromStorage(fileUrl: string): Promise<{ success: boolean; error: string | null }> {
  const cleanPath = sanitizeStoragePath(fileUrl)
  const supabase = createAdminClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([cleanPath])
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, error: null }
}
