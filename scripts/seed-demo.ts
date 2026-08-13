import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const organizationId = process.env.DEMO_ORGANIZATION_ID?.trim()
  if (!organizationId || process.env.DEMO_SEED_CONFIRM !== 'SEED_DEMO_DATA') {
    throw new Error('Définissez DEMO_ORGANIZATION_ID et DEMO_SEED_CONFIRM=SEED_DEMO_DATA')
  }
  const organization = await db.organization.findUnique({ where: { id: organizationId } })
  const serviceChef = await db.profile.findFirst({ where: { organizationId, isActive: true, role: { in: ['ADMIN', 'AGENT'] } } })
  if (!organization || !serviceChef) throw new Error('Organisation ou utilisateur responsable introuvable')

  await db.case.deleteMany({ where: { organizationId, reference: { startsWith: 'DEMO-' } } })
  await db.client.deleteMany({ where: { organizationId, taxId: { startsWith: 'DEMO-' } } })

  const [construction, electronics] = await Promise.all([
    db.client.create({ data: { organizationId, name: 'Société Guinéenne de Construction', type: 'entreprise', sector: 'BTP', taxId: 'DEMO-NIF-BTP-001', address: 'Kipé, commune de Ratoma', city: 'Conakry', country: 'Guinée', phone: '+224 600 00 00 01', email: 'logistique@construction.example' } }),
    db.client.create({ data: { organizationId, name: 'Distribution Électronique de Guinée', type: 'entreprise', sector: 'Distribution', taxId: 'DEMO-NIF-ELEC-002', address: 'Matam, commune de Matam', city: 'Conakry', country: 'Guinée', phone: '+224 600 00 00 02', email: 'operations@electronique.example' } }),
  ])

  await db.case.createMany({ data: [
    { organizationId, reference: 'DEMO-MAR-0001', type: 'maritime', direction: 'import', status: 'en_transit', priority: 'normale', clientId: construction.id, serviceChefId: serviceChef.id, merchandise: 'Matériaux de construction', weightKg: 18500, volumeM3: 42, packageCount: 360, declaredValue: 420000000, incoterm: 'CIF', originPort: 'Port d’Anvers', destinationPort: 'Port Autonome de Conakry', estimatedRevenue: 18500000, estimatedCost: 12100000 },
    { organizationId, reference: 'DEMO-AER-0002', type: 'aerien', direction: 'import', status: 'documents_en_attente', priority: 'haute', clientId: electronics.id, serviceChefId: serviceChef.id, merchandise: 'Équipements électroniques', weightKg: 780, volumeM3: 4.5, packageCount: 28, declaredValue: 235000000, incoterm: 'DAP', originPort: 'Paris CDG', destinationPort: 'Aéroport international Ahmed Sékou Touré', estimatedRevenue: 9200000, estimatedCost: 6100000 },
  ] })
  console.log(`Données de démonstration créées dans ${organization.name}.`)
}

main().finally(() => db.$disconnect())
