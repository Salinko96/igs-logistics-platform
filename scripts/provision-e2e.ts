import { randomBytes } from 'node:crypto'
import { chmod, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient, app_role } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('Variables Supabase serveur manquantes')

const prisma = new PrismaClient()
const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
const outputPath = process.env.E2E_OUTPUT_PATH || '/tmp/igs-e2e.env'
const runId = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const domain = process.env.E2E_EMAIL_DOMAIN || 'example.com'

function password() {
  return `E2e!${randomBytes(18).toString('base64url')}9aA`
}

async function allAuthUsers() {
  const users = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
}

async function createAuthUser(email: string, userPassword: string, role: app_role, organizationId: string) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: true,
    app_metadata: { role, organization_id: organizationId, e2e: true },
    user_metadata: { first_name: role === 'ADMIN' ? 'Admin' : 'Agent', last_name: 'E2E' },
  })
  if (error || !data.user) throw error || new Error(`Création Auth impossible pour ${email}`)
  return data.user
}

async function createTenant(label: 'A' | 'B', agentEmail: string, agentPassword: string) {
  const slug = `igs-e2e-${label.toLowerCase()}-${runId}`
  const organization = await prisma.organization.create({ data: {
    name: `IGS E2E ORG ${label}`,
    slug,
    address: `Zone de test ${label}, Kaloum`,
    city: 'Conakry', country: 'Guinée', phone: '+224 600 00 00 00',
    email: `e2e-org-${label.toLowerCase()}@${domain}`, taxId: `NIF-E2E-${label}-${runId}`,
    settings: { create: { invoicePrefix: `E2E${label}`, casePrefix: `E2E${label}`, currency: 'GNF' } },
    subscription: { create: {
      planId: 'saas_plan_enterprise', status: 'active', provider: 'e2e', billingCycle: 'monthly',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    } },
  } })
  const user = await createAuthUser(agentEmail, agentPassword, app_role.AGENT, organization.id)
  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: { organizationId: organization.id, email: agentEmail, role: app_role.AGENT, isActive: true },
    create: { organizationId: organization.id, userId: user.id, firstName: 'Agent', lastName: `E2E ${label}`, email: agentEmail, role: app_role.AGENT },
  })
  const client = await prisma.client.create({ data: {
    organizationId: organization.id, name: `Client E2E ${label}`, type: 'entreprise', segment: 'Test',
    taxId: `CLIENT-E2E-${label}`, address: `Adresse client ${label}`, city: 'Conakry', country: 'Guinée',
    phone: '+224 611 11 11 11', email: `client-e2e-${label.toLowerCase()}@${domain}`,
  } })
  const caseRecord = await prisma.case.create({ data: {
    organizationId: organization.id, reference: `E2E${label}-${runId}-0001`, type: 'maritime', direction: 'import',
    status: 'en_cours', priority: 'normale', clientId: client.id, serviceChefId: profile.id,
    description: `Dossier automatisé E2E organisation ${label}`, merchandise: 'Marchandise de test',
  } })
  return { organization, user, profile, client, caseRecord }
}

async function enrollAdminTotp(email: string, adminPassword: string) {
  const client = createClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: adminPassword })
  if (signInError) throw signInError
  const { data: enrolled, error: enrollError } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `IGS E2E ${runId}` })
  if (enrollError || !enrolled) throw enrollError || new Error('Enrôlement TOTP impossible')
  const speakeasy = await import('speakeasy')
  const token = speakeasy.totp({ secret: enrolled.totp.secret, encoding: 'base32' })
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: enrolled.id })
  if (challengeError || !challenge) throw challengeError || new Error('Challenge TOTP impossible')
  const { error: verifyError } = await client.auth.mfa.verify({ factorId: enrolled.id, challengeId: challenge.id, code: token })
  if (verifyError) throw verifyError
  await client.auth.signOut()
  return enrolled.totp.secret
}

async function main() {
  const existingUsers = await allAuthUsers()
  const oldOrganizations = await prisma.organization.findMany({ where: { slug: { startsWith: 'igs-e2e-' } }, select: { id: true } })
  const oldOrganizationIds = oldOrganizations.map((item) => item.id)
  const oldUserIds = existingUsers.filter((user) => user.app_metadata?.e2e === true || oldOrganizationIds.includes(user.app_metadata?.organization_id)).map((user) => user.id)
  for (const userId of oldUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) throw error
  }
  if (oldOrganizationIds.length) {
    const oldCases = await prisma.case.findMany({ where: { organizationId: { in: oldOrganizationIds } }, select: { id: true } })
    const oldCaseIds = oldCases.map((item) => item.id)
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.invoice.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.document.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.auditLog.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.loginAttempt.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.case.deleteMany({ where: { id: { in: oldCaseIds } } }),
      prisma.profile.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.client.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.saaSSubscriptionPayment.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.saaSSubscription.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.organizationSettings.deleteMany({ where: { organizationId: { in: oldOrganizationIds } } }),
      prisma.organization.deleteMany({ where: { id: { in: oldOrganizationIds } } }),
    ])
  }

  const credentials = {
    orgA: { email: `agent-a-${runId}@${domain}`, password: password() },
    orgB: { email: `agent-b-${runId}@${domain}`, password: password() },
    admin: { email: `admin-${runId}@${domain}`, password: password() },
  }
  const orgA = await createTenant('A', credentials.orgA.email, credentials.orgA.password)
  const orgB = await createTenant('B', credentials.orgB.email, credentials.orgB.password)
  const adminUser = await createAuthUser(credentials.admin.email, credentials.admin.password, app_role.ADMIN, orgA.organization.id)
  await prisma.profile.upsert({
    where: { userId: adminUser.id },
    update: { organizationId: orgA.organization.id, email: credentials.admin.email, role: app_role.ADMIN, isActive: true },
    create: { organizationId: orgA.organization.id, userId: adminUser.id, firstName: 'Admin', lastName: 'E2E', email: credentials.admin.email, role: app_role.ADMIN },
  })
  const totpSecret = await enrollAdminTotp(credentials.admin.email, credentials.admin.password)

  const values = {
    E2E_BASE_URL: 'https://igs-logistics-platform.vercel.app',
    E2E_ORG_A_EMAIL: credentials.orgA.email,
    E2E_ORG_A_PASSWORD: credentials.orgA.password,
    E2E_ORG_A_CASE_ID: orgA.caseRecord.id,
    E2E_ORG_B_EMAIL: credentials.orgB.email,
    E2E_ORG_B_PASSWORD: credentials.orgB.password,
    E2E_ORG_B_CASE_ID: orgB.caseRecord.id,
    E2E_ADMIN_EMAIL: credentials.admin.email,
    E2E_ADMIN_PASSWORD: credentials.admin.password,
    E2E_ADMIN_TOTP_SECRET: totpSecret,
  }
  await writeFile(outputPath, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 })
  await chmod(outputPath, 0o600)
  console.log(JSON.stringify({ outputPath, organizations: [orgA.organization.slug, orgB.organization.slug], cases: [orgA.caseRecord.reference, orgB.caseRecord.reference], adminTotpVerified: true }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
