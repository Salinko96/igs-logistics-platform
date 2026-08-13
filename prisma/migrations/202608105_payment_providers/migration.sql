ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'manuel',
  ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_organizationId_providerPaymentId_idx"
  ON "Payment"("organizationId", "providerPaymentId");
