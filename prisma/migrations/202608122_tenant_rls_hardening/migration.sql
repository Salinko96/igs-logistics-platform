CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT "organizationId" FROM public."Profile"
  WHERE "userId" = auth.uid()::text AND "isActive" = true
  LIMIT 1
$$;

ALTER FUNCTION public.current_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_user_client_id() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_client_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_client_id() TO authenticated;

DROP POLICY IF EXISTS "staff_all_org" ON public."Organization";
CREATE POLICY "staff_tenant_org" ON public."Organization" FOR ALL TO authenticated
USING (id = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK (id = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_profile" ON public."Profile";
CREATE POLICY "staff_tenant_profile" ON public."Profile" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_client" ON public."Client";
CREATE POLICY "staff_tenant_client" ON public."Client" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_case" ON public."Case";
CREATE POLICY "staff_tenant_case" ON public."Case" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_document" ON public."Document";
CREATE POLICY "staff_tenant_document" ON public."Document" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_invoice" ON public."Invoice";
CREATE POLICY "staff_tenant_invoice" ON public."Invoice" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_payment" ON public."Payment";
CREATE POLICY "staff_tenant_payment" ON public."Payment" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "staff_all_incident" ON public."Incident";
CREATE POLICY "staff_tenant_incident" ON public."Incident" FOR ALL TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'))
WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'AGENT'));

DROP POLICY IF EXISTS "admin_all_audit" ON public."AuditLog";
CREATE POLICY "admin_tenant_audit" ON public."AuditLog" FOR SELECT TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Authenticated users can delete from transit-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert into transit-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can select from transit-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update transit-documents" ON storage.objects;

CREATE POLICY "tenant_read_transit_documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'transit-documents' AND (storage.foldername(name))[1] = current_user_organization_id());
CREATE POLICY "tenant_insert_transit_documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'transit-documents' AND (storage.foldername(name))[1] = current_user_organization_id());
CREATE POLICY "tenant_update_transit_documents" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'transit-documents' AND (storage.foldername(name))[1] = current_user_organization_id())
WITH CHECK (bucket_id = 'transit-documents' AND (storage.foldername(name))[1] = current_user_organization_id());
CREATE POLICY "tenant_delete_transit_documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'transit-documents' AND (storage.foldername(name))[1] = current_user_organization_id());
