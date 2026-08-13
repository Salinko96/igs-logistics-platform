import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Upload a file to the `transit-documents` bucket under a case folder.
 * @param caseId - Identifier of the case.
 * @param file   - File object with name, type, and data.
 */
export async function uploadFile(caseId: string, file: { name: string; type: string; data: Buffer }): Promise<string> {
  const bucket = 'transit-documents';
  const filePath = `cases/${caseId}/${file.name}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, file.data, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return filePath;
}

/**
 * Generate a signed URL for a stored file.
 * @param path - Path inside the bucket.
 * @param expiresInSeconds - Expiration time (default 300s).
 */
export async function getSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const bucket = 'transit-documents';
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
  return data?.signedUrl ?? '';
}
