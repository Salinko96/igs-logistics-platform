-- Inscription individuelle gérée. Les profils existants restent approuvés.
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "requestedRole" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
CREATE INDEX IF NOT EXISTS "Profile_organizationId_approvalStatus_idx" ON "Profile"("organizationId", "approvalStatus");
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_approvalStatus_check";
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_approvalStatus_check" CHECK ("approvalStatus" IN ('pending', 'approved', 'rejected'));
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_requestedRole_check";
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_requestedRole_check" CHECK ("requestedRole" IS NULL OR "requestedRole" IN ('COMMERCIAL', 'EXPLOITANT', 'COMPTABLE'));

CREATE OR REPLACE FUNCTION public.current_user_is_secure_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Profile" p
    WHERE p."userId" = auth.uid()::text AND p."isActive" = true AND p."approvalStatus" = 'approved'
      AND (
        p.role IN ('AGENT', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE')
        OR (p.role = 'ADMIN' AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2')
      )
  )
$$;

-- SELECT partagé dans l'organisation; écritures réparties par métier.
DROP POLICY IF EXISTS "staff_tenant_client" ON "Client";
DROP POLICY IF EXISTS "company_client_read" ON "Client";
DROP POLICY IF EXISTS "company_client_write" ON "Client";
CREATE POLICY "company_client_read" ON "Client" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
CREATE POLICY "company_client_write" ON "Client" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMMERCIAL')) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMMERCIAL'));

DROP POLICY IF EXISTS "staff_tenant_case" ON "Case";
DROP POLICY IF EXISTS "company_case_read" ON "Case";
DROP POLICY IF EXISTS "company_case_create" ON "Case";
DROP POLICY IF EXISTS "company_case_ops_update" ON "Case";
CREATE POLICY "company_case_read" ON "Case" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
CREATE POLICY "company_case_create" ON "Case" FOR INSERT TO authenticated WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMMERCIAL', 'EXPLOITANT'));
CREATE POLICY "company_case_ops_update" ON "Case" FOR UPDATE TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'EXPLOITANT')) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'EXPLOITANT'));

DROP POLICY IF EXISTS "staff_tenant_document" ON "Document";
DROP POLICY IF EXISTS "company_document_read" ON "Document";
DROP POLICY IF EXISTS "company_document_ops_write" ON "Document";
CREATE POLICY "company_document_read" ON "Document" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
CREATE POLICY "company_document_ops_write" ON "Document" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'EXPLOITANT')) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'EXPLOITANT'));

DROP POLICY IF EXISTS "staff_tenant_invoice" ON "Invoice";
DROP POLICY IF EXISTS "company_invoice_read" ON "Invoice";
DROP POLICY IF EXISTS "company_invoice_draft" ON "Invoice";
DROP POLICY IF EXISTS "company_invoice_accounting_update" ON "Invoice";
CREATE POLICY "company_invoice_read" ON "Invoice" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
CREATE POLICY "company_invoice_draft" ON "Invoice" FOR INSERT TO authenticated WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'EXPLOITANT', 'COMPTABLE'));
CREATE POLICY "company_invoice_accounting_update" ON "Invoice" FOR UPDATE TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMPTABLE')) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMPTABLE'));

DROP POLICY IF EXISTS "staff_tenant_payment" ON "Payment";
DROP POLICY IF EXISTS "company_payment_read" ON "Payment";
DROP POLICY IF EXISTS "company_payment_accounting_write" ON "Payment";
CREATE POLICY "company_payment_read" ON "Payment" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_is_secure_staff());
CREATE POLICY "company_payment_accounting_write" ON "Payment" FOR ALL TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMPTABLE')) WITH CHECK ("organizationId" = current_user_organization_id() AND current_user_role() IN ('ADMIN', 'COMPTABLE'));
