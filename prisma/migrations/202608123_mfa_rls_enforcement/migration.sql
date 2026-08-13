CREATE OR REPLACE FUNCTION public.current_user_is_secure_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN current_user_role() = 'AGENT' THEN true
    WHEN current_user_role() = 'ADMIN' THEN coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.current_user_is_secure_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_secure_staff() TO authenticated;

DROP POLICY IF EXISTS "staff_tenant_org" ON public."Organization";
CREATE POLICY "staff_tenant_org" ON public."Organization" FOR ALL TO authenticated USING (id = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK (id = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_profile" ON public."Profile";
CREATE POLICY "staff_tenant_profile" ON public."Profile" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_client" ON public."Client";
CREATE POLICY "staff_tenant_client" ON public."Client" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_case" ON public."Case";
CREATE POLICY "staff_tenant_case" ON public."Case" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_document" ON public."Document";
CREATE POLICY "staff_tenant_document" ON public."Document" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_invoice" ON public."Invoice";
CREATE POLICY "staff_tenant_invoice" ON public."Invoice" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_payment" ON public."Payment";
CREATE POLICY "staff_tenant_payment" ON public."Payment" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
DROP POLICY IF EXISTS "staff_tenant_incident" ON public."Incident";
CREATE POLICY "staff_tenant_incident" ON public."Incident" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff()) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());

DROP POLICY IF EXISTS "admin_tenant_audit" ON public."AuditLog";
CREATE POLICY "admin_tenant_audit" ON public."AuditLog" FOR SELECT TO authenticated
USING ("organizationId" = current_user_organization_id() AND current_user_role() = 'ADMIN' AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2');
