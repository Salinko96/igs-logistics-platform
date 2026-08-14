import { createClient } from '@supabase/supabase-js'
import { PrismaClient, type app_role } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' })

const db = new PrismaClient()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Configuration Supabase admin manquante')
const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const users = [
  { email: 'fatou.camara@igs.gn', firstName: 'Fatou', lastName: 'Camara', role: 'COMMERCIAL' as app_role, password: process.env.SEED_COMMERCIAL_PASSWORD },
  { email: 'mamadou.conde@igs.gn', firstName: 'Mamadou', lastName: 'Condé', role: 'EXPLOITANT' as app_role, password: process.env.SEED_EXPLOITANT_PASSWORD },
  { email: 'aissatou.diallo@igs.gn', firstName: 'Aissatou', lastName: 'Diallo', role: 'COMPTABLE' as app_role, password: process.env.SEED_COMPTABLE_PASSWORD },
]

async function main() {
  if (users.some((user) => !user.password)) throw new Error('Définissez les trois variables SEED_*_PASSWORD; aucun mot de passe n’est codé en dur.')
  const organization = process.env.IGS_ORGANIZATION_ID ? await db.organization.findUnique({ where: { id: process.env.IGS_ORGANIZATION_ID } }) : await db.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!organization) throw new Error('Organisation IGS introuvable')
  const { data } = await auth.auth.admin.listUsers({ perPage: 1000 })
  const profiles = new Map<string, Awaited<ReturnType<typeof db.profile.upsert>>>()
  for (const seed of users) {
    let user = data.users.find((item) => item.email === seed.email)
    if (!user) { const created = await auth.auth.admin.createUser({ email: seed.email, password: seed.password!, email_confirm: true, user_metadata: { role: seed.role, organization_id: organization.id, first_name: seed.firstName, last_name: seed.lastName } }); if (created.error || !created.data.user) throw created.error || new Error(`Création impossible: ${seed.email}`); user = created.data.user }
    else await auth.auth.admin.updateUserById(user.id, { password: seed.password!, user_metadata: { role: seed.role, organization_id: organization.id, first_name: seed.firstName, last_name: seed.lastName } })
    const profile = await db.profile.upsert({ where: { userId: user.id }, update: { role: seed.role, approvalStatus: 'approved', requestedRole: seed.role, isActive: true, site: 'Conakry', agency: 'Conakry', approvedAt: new Date() }, create: { organizationId: organization.id, userId: user.id, email: seed.email, firstName: seed.firstName, lastName: seed.lastName, role: seed.role, requestedRole: seed.role, approvalStatus: 'approved', isActive: true, site: 'Conakry', agency: 'Conakry', approvedAt: new Date() } })
    profiles.set(seed.role, profile)
  }
  const commercial = profiles.get('COMMERCIAL')!; const exploitant = profiles.get('EXPLOITANT')!
  await db.client.updateMany({ where: { organizationId: organization.id, name: { in: ['Guinée Énergie SA', 'BTP Guinée Construction'] } }, data: { commercialOwnerId: commercial.id } })
  await db.case.updateMany({ where: { organizationId: organization.id, reference: 'IGS-2027-MUL-0001' }, data: { commercialId: commercial.id, serviceChefId: exploitant.id } })
  const client = await db.client.findFirst({ where: { organizationId: organization.id, name: 'Guinée Énergie SA' } })
  if (client && !await db.quotation.findFirst({ where: { organizationId: organization.id, quotationNumber: 'DEV-2026-DEMO' } })) await db.quotation.create({ data: { organizationId: organization.id, clientId: client.id, commercialId: commercial.id, quotationNumber: 'DEV-2026-DEMO', status: 'accepte', subtotal: 12_000_000, taxRate: 18, taxAmount: 2_160_000, totalAmount: 14_160_000, acceptedAt: new Date(), items: { create: [{ description: 'Prestation logistique multimodale', quantity: 1, unitPrice: 12_000_000, total: 12_000_000 }] } } })
  const aerCase = await db.case.findFirst({ where: { organizationId: organization.id, reference: 'IGS-2027-AER-0005' } })
  if (aerCase && !await db.incident.findFirst({ where: { caseId: aerCase.id, title: 'Panne véhicule' } })) await db.incident.create({ data: { organizationId: organization.id, caseId: aerCase.id, title: 'Panne véhicule', description: 'Immobilisation du véhicule de livraison.', type: 'panne', severity: 'eleve' } })
  console.log('Flux métier seedé sans duplication pour les 3 comptes IGS.')
}
main().finally(() => db.$disconnect())
