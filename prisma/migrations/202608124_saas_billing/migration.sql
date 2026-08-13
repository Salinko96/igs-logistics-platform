CREATE TABLE "SaaSPlan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "monthlyPrice" INTEGER NOT NULL,
  "annualPrice" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GNF',
  "maxCasesPerMonth" INTEGER,
  "maxUsers" INTEGER,
  "maxStorageBytes" BIGINT,
  "features" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaaSSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trialing',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaaSSubscriptionPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerPaymentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GNF',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "billingPeriodStart" TIMESTAMP(3),
  "billingPeriodEnd" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "receiptUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSSubscriptionPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaaSPlan_code_key" ON "SaaSPlan"("code");
CREATE UNIQUE INDEX "SaaSSubscription_organizationId_key" ON "SaaSSubscription"("organizationId");
CREATE UNIQUE INDEX "SaaSSubscription_providerCustomerId_key" ON "SaaSSubscription"("providerCustomerId");
CREATE UNIQUE INDEX "SaaSSubscription_providerSubscriptionId_key" ON "SaaSSubscription"("providerSubscriptionId");
CREATE INDEX "SaaSSubscription_planId_idx" ON "SaaSSubscription"("planId");
CREATE INDEX "SaaSSubscription_status_currentPeriodEnd_idx" ON "SaaSSubscription"("status", "currentPeriodEnd");
CREATE UNIQUE INDEX "SaaSSubscriptionPayment_providerPaymentId_key" ON "SaaSSubscriptionPayment"("providerPaymentId");
CREATE INDEX "SaaSSubscriptionPayment_organizationId_createdAt_idx" ON "SaaSSubscriptionPayment"("organizationId", "createdAt");
CREATE INDEX "SaaSSubscriptionPayment_subscriptionId_status_idx" ON "SaaSSubscriptionPayment"("subscriptionId", "status");

ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaaSPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaaSSubscriptionPayment" ADD CONSTRAINT "SaaSSubscriptionPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaaSSubscriptionPayment" ADD CONSTRAINT "SaaSSubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaaSSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SaaSPlan" ("id", "code", "name", "description", "monthlyPrice", "annualPrice", "currency", "maxCasesPerMonth", "maxUsers", "maxStorageBytes", "features", "displayOrder", "updatedAt") VALUES
  ('saas_plan_starter', 'starter', 'Starter', 'Pour une petite équipe de transit qui structure ses opérations.', 750000, 7500000, 'GNF', 50, 5, 5368709120, '["Dossiers et documents", "Facturation guinéenne", "Suivi maritime", "Support standard"]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('saas_plan_business', 'business', 'Business', 'Pour une entreprise logistique en croissance et multi-services.', 2000000, 20000000, 'GNF', 300, 20, 53687091200, '["Tout Starter", "Douane et débours avancés", "Rapports et audit", "Support prioritaire"]'::jsonb, 2, CURRENT_TIMESTAMP),
  ('saas_plan_enterprise', 'enterprise', 'Enterprise', 'Pour les groupes nécessitant capacité, accompagnement et SLA sur mesure.', 0, 0, 'GNF', NULL, NULL, NULL, '["Tout Business", "Utilisateurs et dossiers illimités", "SLA et onboarding dédiés", "Intégrations sur mesure"]'::jsonb, 3, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name", "description" = EXCLUDED."description", "monthlyPrice" = EXCLUDED."monthlyPrice",
  "annualPrice" = EXCLUDED."annualPrice", "currency" = EXCLUDED."currency", "maxCasesPerMonth" = EXCLUDED."maxCasesPerMonth",
  "maxUsers" = EXCLUDED."maxUsers", "maxStorageBytes" = EXCLUDED."maxStorageBytes", "features" = EXCLUDED."features",
  "displayOrder" = EXCLUDED."displayOrder", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SaaSSubscription" ("id", "organizationId", "planId", "status", "billingCycle", "provider", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
SELECT 'saas_sub_' || md5(o."id"), o."id", 'saas_plan_business', 'active', 'annual', 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', CURRENT_TIMESTAMP
FROM "Organization" o
ON CONFLICT ("organizationId") DO NOTHING;

ALTER TABLE "SaaSPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaaSSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaaSSubscriptionPayment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_active_saas_plans" ON "SaaSPlan" FOR SELECT TO authenticated USING ("isActive" = true);
CREATE POLICY "admin_read_tenant_subscription" ON "SaaSSubscription" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() = 'ADMIN' AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2');
CREATE POLICY "admin_read_tenant_subscription_payments" ON "SaaSSubscriptionPayment" FOR SELECT TO authenticated USING ("organizationId" = current_user_organization_id() AND current_user_role() = 'ADMIN' AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2');
