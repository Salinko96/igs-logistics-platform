-- Migration additive: espaces Commercial, Exploitant et Comptable.
ALTER TYPE "app_role" ADD VALUE IF NOT EXISTS 'COMMERCIAL';
ALTER TYPE "app_role" ADD VALUE IF NOT EXISTS 'EXPLOITANT';
ALTER TYPE "app_role" ADD VALUE IF NOT EXISTS 'COMPTABLE';

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "rccm" TEXT,
  ADD COLUMN IF NOT EXISTS "vatRegistered" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "agency" TEXT NOT NULL DEFAULT 'Conakry',
  ADD COLUMN IF NOT EXISTS "site" TEXT NOT NULL DEFAULT 'Conakry';

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "acronym" TEXT,
  ADD COLUMN IF NOT EXISTS "rccm" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "commune" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT,
  ADD COLUMN IF NOT EXISTS "commercialOwnerId" TEXT;

CREATE INDEX IF NOT EXISTS "Client_commercialOwnerId_idx" ON "Client"("commercialOwnerId");
DO $$ BEGIN
  ALTER TABLE "Client" ADD CONSTRAINT "Client_commercialOwnerId_fkey"
    FOREIGN KEY ("commercialOwnerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Quotation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "commercialId" TEXT NOT NULL,
  "caseId" TEXT,
  "quotationNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'brouillon',
  "currency" TEXT NOT NULL DEFAULT 'GNF',
  "exchangeRateGnf" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
  "taxAmount" DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "validUntil" TIMESTAMP(3),
  "notes" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Quotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Quotation_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_organizationId_quotationNumber_key" ON "Quotation"("organizationId", "quotationNumber");
CREATE INDEX IF NOT EXISTS "Quotation_organizationId_commercialId_status_idx" ON "Quotation"("organizationId", "commercialId", "status");
CREATE INDEX IF NOT EXISTS "Quotation_clientId_idx" ON "Quotation"("clientId");

CREATE TABLE IF NOT EXISTS "QuotationItem" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

ALTER TABLE "CustomsDeclaration"
  ADD COLUMN IF NOT EXISTS "circuit" TEXT,
  ADD COLUMN IF NOT EXISTS "liquidationNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentReceiptNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "removalAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "mobileNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "operator" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

ALTER TABLE "Quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotationItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_select_scope" ON "Quotation";
CREATE POLICY "quotation_select_scope" ON "Quotation" FOR SELECT TO authenticated
USING (
  "organizationId" = current_user_organization_id()
  AND (
    current_user_role() IN ('ADMIN', 'AGENT', 'EXPLOITANT', 'COMPTABLE')
    OR (current_user_role() = 'COMMERCIAL' AND "commercialId" = (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text LIMIT 1))
  )
);
DROP POLICY IF EXISTS "quotation_write_scope" ON "Quotation";
CREATE POLICY "quotation_write_scope" ON "Quotation" FOR ALL TO authenticated
USING (
  "organizationId" = current_user_organization_id()
  AND (current_user_role() = 'ADMIN' OR (current_user_role() = 'COMMERCIAL' AND "commercialId" = (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text LIMIT 1)))
)
WITH CHECK (
  "organizationId" = current_user_organization_id()
  AND (current_user_role() = 'ADMIN' OR (current_user_role() = 'COMMERCIAL' AND "commercialId" = (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text LIMIT 1)))
);
DROP POLICY IF EXISTS "quotation_item_scope" ON "QuotationItem";
CREATE POLICY "quotation_item_scope" ON "QuotationItem" FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM "Quotation" q WHERE q.id = "quotationId"))
WITH CHECK (EXISTS (SELECT 1 FROM "Quotation" q WHERE q.id = "quotationId"));

-- Les policies applicatives existantes restent la seconde barrière. Cette fonction
-- autorise les rôles métier à franchir la barrière tenant; le périmètre fin est
-- appliqué par les policies spécialisées et les routes serveur.
CREATE OR REPLACE FUNCTION public.current_user_is_secure_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN current_user_role() IN ('AGENT', 'COMMERCIAL', 'EXPLOITANT', 'COMPTABLE') THEN true
    WHEN current_user_role() = 'ADMIN' THEN coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    ELSE false
  END
$$;
