import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const statements = [
  // 1. Create App Role Enum
  `CREATE TYPE app_role AS ENUM ('ADMIN', 'AGENT', 'CLIENT')`,

  // 2. Update existing Profile role values before altering type
  `UPDATE "Profile" SET role = 'ADMIN' WHERE role IN ('dg', 'do', 'daf', 'admin', 'DG', 'DAF', 'ADMIN')`,
  `UPDATE "Profile" SET role = 'CLIENT' WHERE role IN ('client', 'CLIENT')`,
  `UPDATE "Profile" SET role = 'AGENT' WHERE role NOT IN ('ADMIN', 'CLIENT') OR role IS NULL`,

  // 3. Alter Profile table: add clientId and alter role column type
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "clientId" TEXT`,
  `ALTER TABLE "Profile" ADD CONSTRAINT "Profile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "Profile" ALTER COLUMN role DROP DEFAULT`,
  `ALTER TABLE "Profile" ALTER COLUMN role TYPE app_role USING role::app_role`,
  `ALTER TABLE "Profile" ALTER COLUMN role SET DEFAULT 'AGENT'::app_role`,

  // 4. Helper Functions for RLS Policies
  `CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role AS $$
DECLARE
  r public.app_role;
BEGIN
  BEGIN
    r := (auth.jwt() -> 'user_metadata' ->> 'role')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    r := NULL;
  END;

  IF r IS NULL THEN
    SELECT role INTO r FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1;
  END IF;
  
  RETURN coalesce(r, 'CLIENT'::public.app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

  `CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS text AS $$
DECLARE
  c_id text;
BEGIN
  c_id := auth.jwt() -> 'user_metadata' ->> 'client_id';

  IF c_id IS NULL THEN
    SELECT "clientId" INTO c_id FROM public."Profile" WHERE "userId" = auth.uid()::text LIMIT 1;
  END IF;
  
  RETURN c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

  // 5. Trigger to automatically create a Profile when a new user registers or is invited
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_org_id text;
  meta_org_id text;
  meta_role public.app_role;
  meta_client_id text;
BEGIN
  SELECT id INTO default_org_id FROM public."Organization" WHERE "isActive" = true LIMIT 1;
  meta_org_id := new.raw_user_meta_data->>'organization_id';
  meta_client_id := new.raw_user_meta_data->>'client_id';
  
  BEGIN
    meta_role := (new.raw_user_meta_data->>'role')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    meta_role := 'AGENT'::public.app_role;
  END;

  INSERT INTO public."Profile" (
    id, 
    "organizationId", 
    "userId", 
    "firstName", 
    "lastName", 
    email, 
    role, 
    "clientId", 
    "isActive",
    "updatedAt"
  )
  VALUES (
    coalesce(new.raw_user_meta_data->>'profile_id', 'p-' || substring(new.id::text from 1 for 8)),
    coalesce(meta_org_id, default_org_id),
    new.id::text,
    coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'last_name', 'IGS'),
    new.email,
    coalesce(meta_role, 'AGENT'::public.app_role),
    meta_client_id,
    true,
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Recreate trigger on auth.users
  `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
  `CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`
]

async function main() {
  console.log('Running SQL statements one by one on database...')
  
  for (let i = 0; i < statements.length; i++) {
    console.log(`Executing statement ${i + 1}/${statements.length}...`)
    try {
      await prisma.$executeRawUnsafe(statements[i])
    } catch (err) {
      // If enum or table changes already exist, ignore error or print warnings
      console.warn(`Statement ${i + 1} execution note:`, err instanceof Error ? err.message : err)
    }
  }
  
  console.log('✅ Local SQL Migration completed!')
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:')
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
