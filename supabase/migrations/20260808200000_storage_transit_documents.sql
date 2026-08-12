-- Storage bucket migration for transit-documents
-- Public: false (private bucket)
-- File size limit: 10MB (10,485,760 bytes)
-- Allowed MIME types: application/pdf, image/png, image/jpeg, image/jpg

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transit-documents',
  'transit-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for storage.objects
DROP POLICY IF EXISTS "Authenticated users can select from transit-documents" ON storage.objects;
CREATE POLICY "Authenticated users can select from transit-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'transit-documents');

DROP POLICY IF EXISTS "Authenticated users can insert into transit-documents" ON storage.objects;
CREATE POLICY "Authenticated users can insert into transit-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transit-documents');

DROP POLICY IF EXISTS "Authenticated users can update transit-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update transit-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'transit-documents');

DROP POLICY IF EXISTS "Authenticated users can delete from transit-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete from transit-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transit-documents');
