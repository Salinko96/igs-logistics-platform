-- Supabase RLS Policies for IGS Nexus

-- Enable RLS on all tables is already done in migration 202608032_supabase_hardening.
-- We will write the access policies.

-- Helper macros:
-- ADMIN/AGENT: current_user_role() IN ('ADMIN', 'AGENT')
-- CLIENT: current_user_role() = 'CLIENT'

-- Drop policies if exist to ensure idempotency
-- 1. Organization
DROP POLICY IF EXISTS staff_all_org ON "Organization";
DROP POLICY IF EXISTS client_select_org ON "Organization";

CREATE POLICY staff_all_org ON "Organization"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_org ON "Organization"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    id = (SELECT "organizationId" FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1)
  );

-- 2. OrganizationSettings
DROP POLICY IF EXISTS admin_all_settings ON "OrganizationSettings";
DROP POLICY IF EXISTS agent_select_settings ON "OrganizationSettings";

CREATE POLICY admin_all_settings ON "OrganizationSettings"
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'ADMIN');

CREATE POLICY agent_select_settings ON "OrganizationSettings"
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'AGENT');

-- 3. Profile
DROP POLICY IF EXISTS staff_all_profile ON "Profile";
DROP POLICY IF EXISTS client_select_profile ON "Profile";
DROP POLICY IF EXISTS self_update_profile ON "Profile";

CREATE POLICY staff_all_profile ON "Profile"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_profile ON "Profile"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND (
      "clientId" = public.current_user_client_id() OR
      "userId" = auth.uid()::text
    )
  );

-- Lock role column for clients on update
CREATE POLICY self_update_profile ON "Profile"
  FOR UPDATE TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK (
    "userId" = auth.uid()::text AND (
      public.current_user_role() IN ('ADMIN', 'AGENT') OR (
        public.current_user_role() = 'CLIENT' AND
        role = (SELECT role FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1) AND
        "clientId" = (SELECT "clientId" FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1)
      )
    )
  );

-- 4. Client
DROP POLICY IF EXISTS staff_all_client ON "Client";
DROP POLICY IF EXISTS client_select_self ON "Client";

CREATE POLICY staff_all_client ON "Client"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_self ON "Client"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    id = public.current_user_client_id()
  );

-- 5. ClientContact
DROP POLICY IF EXISTS staff_all_contact ON "ClientContact";
DROP POLICY IF EXISTS client_select_contact ON "ClientContact";

CREATE POLICY staff_all_contact ON "ClientContact"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_contact ON "ClientContact"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "clientId" = public.current_user_client_id()
  );

-- 6. Opportunity
DROP POLICY IF EXISTS staff_all_opportunity ON "Opportunity";

CREATE POLICY staff_all_opportunity ON "Opportunity"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

-- 7. Case
DROP POLICY IF EXISTS staff_all_case ON "Case";
DROP POLICY IF EXISTS client_select_case ON "Case";

CREATE POLICY staff_all_case ON "Case"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_case ON "Case"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "clientId" = public.current_user_client_id()
  );

-- 8. CaseStatusHistory
DROP POLICY IF EXISTS staff_all_history ON "CaseStatusHistory";
DROP POLICY IF EXISTS client_select_history ON "CaseStatusHistory";

CREATE POLICY staff_all_history ON "CaseStatusHistory"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_history ON "CaseStatusHistory"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 9. CaseAssignee
DROP POLICY IF EXISTS staff_all_assignee ON "CaseAssignee";
DROP POLICY IF EXISTS client_select_assignee ON "CaseAssignee";

CREATE POLICY staff_all_assignee ON "CaseAssignee"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_assignee ON "CaseAssignee"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 10. CaseMilestone
DROP POLICY IF EXISTS staff_all_milestone ON "CaseMilestone";
DROP POLICY IF EXISTS client_select_milestone ON "CaseMilestone";

CREATE POLICY staff_all_milestone ON "CaseMilestone"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_milestone ON "CaseMilestone"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 11. CaseChecklist
DROP POLICY IF EXISTS staff_all_checklist ON "CaseChecklist";
DROP POLICY IF EXISTS client_select_checklist ON "CaseChecklist";

CREATE POLICY staff_all_checklist ON "CaseChecklist"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_checklist ON "CaseChecklist"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 12. Document
DROP POLICY IF EXISTS staff_all_document ON "Document";
DROP POLICY IF EXISTS client_select_document ON "Document";

CREATE POLICY staff_all_document ON "Document"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_document ON "Document"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "sharedWithClient" = true AND (
      "caseId" IS NULL OR 
      EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
    )
  );

-- 13. Shipment
DROP POLICY IF EXISTS staff_all_shipment ON "Shipment";
DROP POLICY IF EXISTS client_select_shipment ON "Shipment";

CREATE POLICY staff_all_shipment ON "Shipment"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_shipment ON "Shipment"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 14. Container
DROP POLICY IF EXISTS staff_all_container ON "Container";
DROP POLICY IF EXISTS client_select_container ON "Container";

CREATE POLICY staff_all_container ON "Container"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_container ON "Container"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (
      SELECT 1 FROM public."Shipment" 
      JOIN public."Case" ON public."Case".id = public."Shipment"."caseId" 
      WHERE public."Shipment".id = "shipmentId" AND public."Case"."clientId" = public.current_user_client_id()
    )
  );

-- 15. Flight
DROP POLICY IF EXISTS staff_all_flight ON "Flight";
DROP POLICY IF EXISTS client_select_flight ON "Flight";

CREATE POLICY staff_all_flight ON "Flight"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_flight ON "Flight"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 16. TransportMission
DROP POLICY IF EXISTS staff_all_mission ON "TransportMission";
DROP POLICY IF EXISTS client_select_mission ON "TransportMission";

CREATE POLICY staff_all_mission ON "TransportMission"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_mission ON "TransportMission"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND (
      "caseId" IS NULL OR 
      EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
    )
  );

-- 17. CustomsDeclaration
DROP POLICY IF EXISTS staff_all_customs ON "CustomsDeclaration";
DROP POLICY IF EXISTS client_select_customs ON "CustomsDeclaration";

CREATE POLICY staff_all_customs ON "CustomsDeclaration"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_customs ON "CustomsDeclaration"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
  );

-- 18. CustomsEvent
DROP POLICY IF EXISTS staff_all_customs_event ON "CustomsEvent";
DROP POLICY IF EXISTS client_select_customs_event ON "CustomsEvent";

CREATE POLICY staff_all_customs_event ON "CustomsEvent"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_customs_event ON "CustomsEvent"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (
      SELECT 1 FROM public."CustomsDeclaration" 
      JOIN public."Case" ON public."Case".id = public."CustomsDeclaration"."caseId" 
      WHERE public."CustomsDeclaration".id = "declarationId" AND public."Case"."clientId" = public.current_user_client_id()
    )
  );

-- 19. ExpenseRequest
DROP POLICY IF EXISTS staff_all_expense ON "ExpenseRequest";

CREATE POLICY staff_all_expense ON "ExpenseRequest"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

-- 20. ExpenseApproval
DROP POLICY IF EXISTS staff_all_expense_approval ON "ExpenseApproval";

CREATE POLICY staff_all_expense_approval ON "ExpenseApproval"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

-- 21. CashTransaction
DROP POLICY IF EXISTS staff_all_transaction ON "CashTransaction";

CREATE POLICY staff_all_transaction ON "CashTransaction"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

-- 22. Invoice
DROP POLICY IF EXISTS staff_all_invoice ON "Invoice";
DROP POLICY IF EXISTS client_select_invoice ON "Invoice";

CREATE POLICY staff_all_invoice ON "Invoice"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_invoice ON "Invoice"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "clientId" = public.current_user_client_id()
  );

-- 23. InvoiceItem
DROP POLICY IF EXISTS staff_all_invoice_item ON "InvoiceItem";
DROP POLICY IF EXISTS client_select_invoice_item ON "InvoiceItem";

CREATE POLICY staff_all_invoice_item ON "InvoiceItem"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_invoice_item ON "InvoiceItem"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    EXISTS (SELECT 1 FROM public."Invoice" WHERE id = "invoiceId" AND "clientId" = public.current_user_client_id())
  );

-- 24. Payment
DROP POLICY IF EXISTS staff_all_payment ON "Payment";
DROP POLICY IF EXISTS client_select_payment ON "Payment";

CREATE POLICY staff_all_payment ON "Payment"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_payment ON "Payment"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "clientId" = public.current_user_client_id()
  );

-- 25. Incident
DROP POLICY IF EXISTS staff_all_incident ON "Incident";
DROP POLICY IF EXISTS client_select_incident ON "Incident";
DROP POLICY IF EXISTS client_insert_incident ON "Incident";

CREATE POLICY staff_all_incident ON "Incident"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_incident ON "Incident"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND (
      "caseId" IS NULL OR
      EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
    )
  );

CREATE POLICY client_insert_incident ON "Incident"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'CLIENT' AND (
      "caseId" IS NULL OR
      EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
    )
  );

-- 26. Notification
DROP POLICY IF EXISTS staff_all_notification ON "Notification";
DROP POLICY IF EXISTS client_select_notification ON "Notification";
DROP POLICY IF EXISTS client_update_notification ON "Notification";

CREATE POLICY staff_all_notification ON "Notification"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_notification ON "Notification"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "profileId" = (SELECT id FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1)
  );

CREATE POLICY client_update_notification ON "Notification"
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "profileId" = (SELECT id FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1)
  )
  WITH CHECK (
    public.current_user_role() = 'CLIENT' AND
    "profileId" = (SELECT id FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1)
  );

-- 27. Comment
DROP POLICY IF EXISTS staff_all_comment ON "Comment";
DROP POLICY IF EXISTS client_select_comment ON "Comment";

CREATE POLICY staff_all_comment ON "Comment"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

CREATE POLICY client_select_comment ON "Comment"
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'CLIENT' AND
    "isInternal" = false AND (
      "caseId" IS NULL OR
      EXISTS (SELECT 1 FROM public."Case" WHERE id = "caseId" AND "clientId" = public.current_user_client_id())
    )
  );

-- 28. AuditLog
DROP POLICY IF EXISTS admin_all_audit ON "AuditLog";

CREATE POLICY admin_all_audit ON "AuditLog"
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'ADMIN');

-- 29. ExchangeRate
DROP POLICY IF EXISTS staff_all_exchange ON "ExchangeRate";

CREATE POLICY staff_all_exchange ON "ExchangeRate"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));

-- 30. ServiceCatalog
DROP POLICY IF EXISTS staff_all_catalog ON "ServiceCatalog";

CREATE POLICY staff_all_catalog ON "ServiceCatalog"
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'AGENT'));
