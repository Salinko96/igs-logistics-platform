CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "identifierHash" TEXT NOT NULL,
  "emailMasked" TEXT,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastFailedAt" TIMESTAMP(3),
  "lastIpAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoginAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoginAttempt_identifierHash_key" ON "LoginAttempt"("identifierHash");
CREATE INDEX IF NOT EXISTS "LoginAttempt_organizationId_idx" ON "LoginAttempt"("organizationId");
CREATE INDEX IF NOT EXISTS "LoginAttempt_lockedUntil_idx" ON "LoginAttempt"("lockedUntil");

ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LoginAttempt" FROM anon, authenticated;

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
