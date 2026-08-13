import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.SEED_ALLOW !== '1') {
    throw new Error('Peuplement désactivé: définir SEED_ALLOW=1 pour autoriser le seed')
  }

  console.log('🚀 Peuplement de la base de données IGS Nexus...')

  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.customsEvent.deleteMany()
  await prisma.customsDeclaration.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.cashTransaction.deleteMany()
  await prisma.expenseApproval.deleteMany()
  await prisma.expenseRequest.deleteMany()
  await prisma.transportMission.deleteMany()
  await prisma.flight.deleteMany()
  await prisma.container.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.caseChecklist.deleteMany()
  await prisma.caseMilestone.deleteMany()
  await prisma.caseAssignee.deleteMany()
  await prisma.caseStatusHistory.deleteMany()
  await prisma.incident.deleteMany()
  await prisma.case.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.clientContact.deleteMany()
  await prisma.client.deleteMany()
  await prisma.exchangeRate.deleteMany()
  await prisma.serviceCatalog.deleteMany()
  await prisma.organizationSettings.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.organization.deleteMany()

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'IGS Global Forwarding',
      slug: 'igs-global-forwarding',
      address: 'Corniche Nord, Kaloum',
      city: 'Conakry',
      country: 'Guinée',
      phone: '+224 622 11 22 33',
      email: 'contact@igsglobalforwarding.com',
      taxId: 'NIF-2024-001234',
    },
  })
  console.log('✅ Organisation créée')

  await prisma.organizationSettings.create({
    data: {
      organizationId: org.id,
      currency: 'GNF',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Africa/Conakry',
      language: 'fr',
      invoicePrefix: 'FAC',
      casePrefix: 'IGS',
    },
  })

  // 2. Profiles
  const profiles = await prisma.profile.createMany({
    data: [
      { organizationId: org.id, userId: `u-dg-001`, firstName: 'Amadou', lastName: 'Diallo', email: 'a.diallo@igsgf.com', phone: '+224 621 00 00 01', role: 'dg' },
      { organizationId: org.id, userId: `u-do-002`, firstName: 'Fatoumata', lastName: 'Bah', email: 'f.bah@igsgf.com', phone: '+224 621 00 00 02', role: 'do' },
      { organizationId: org.id, userId: `u-daf-003`, firstName: 'Ibrahim', lastName: 'Soumah', email: 'i.soumah@igsgf.com', phone: '+224 621 00 00 03', role: 'daf' },
      { organizationId: org.id, userId: `u-cm-004`, firstName: 'Mamadou', lastName: 'Condé', email: 'm.conde@igsgf.com', phone: '+224 621 00 00 04', role: 'chef_maritime' },
      { organizationId: org.id, userId: `u-ca-005`, firstName: 'Aissatou', lastName: 'Sylla', email: 'a.sylla@igsgf.com', phone: '+224 621 00 00 05', role: 'chef_aerien' },
      { organizationId: org.id, userId: `u-ag-006`, firstName: 'Ousmane', lastName: 'Kamissoko', email: 'o.kamissoko@igsgf.com', phone: '+224 621 00 00 06', role: 'agent' },
      { organizationId: org.id, userId: `u-dec-007`, firstName: 'Sékou', lastName: 'Touré', email: 's.toure@igsgf.com', phone: '+224 621 00 00 07', role: 'declarant' },
      { organizationId: org.id, userId: `u-cpt-008`, firstName: 'Mariam', lastName: 'Keita', email: 'm.keita@igsgf.com', phone: '+224 621 00 00 08', role: 'comptable' },
    ],
  })
  const allProfiles = await prisma.profile.findMany({ where: { organizationId: org.id } })
  const p = (role: string) => allProfiles.find((pr) => pr.role === role)!
  console.log('✅ Profils créés')

  // 3. Clients
  const clientsData = [
    { name: 'Société Commerciale de Guinée', type: 'entreprise', sector: 'Importateur', segment: 'Premium', taxId: 'NIF-SCG-2024-001', address: 'Zone industrielle de Dubréka', city: 'Conakry', phone: '+224 628 11 11 01', email: 'contact@scg-gn.com' },
    { name: 'Guinée Distribution SARL', type: 'entreprise', sector: 'Distributeur', segment: 'Standard', taxId: 'NIF-GDS-2024-002', address: 'Boulevard du Commerce, Almamya', city: 'Conakry', phone: '+224 628 22 22 02', email: 'info@guineedistribution.com' },
    { name: 'Ciment de Guinée', type: 'entreprise', sector: 'Industriel', segment: 'Premium', taxId: 'NIF-CDG-2024-003', address: 'Zone portuaire', city: 'Conakry', phone: '+224 628 33 33 03', email: 'production@cimentguinee.com' },
    { name: 'Conakry Agro-Industries', type: 'entreprise', sector: 'Agroalimentaire', segment: 'Standard', taxId: 'NIF-CAI-2024-004', address: 'Route de Kindia, km 12', city: 'Conakry', phone: '+224 628 44 44 04', email: 'direction@caiguinee.com' },
    { name: 'Guinée Telecom Services', type: 'entreprise', sector: 'Télécommunications', segment: 'Premium', taxId: 'NIF-GTS-2024-005', address: 'Immeuble Synergie, Dixinn', city: 'Conakry', phone: '+224 628 55 55 05', email: 'fourniture@gtelecom.gn' },
    { name: 'Société Minière de Kindia', type: 'entreprise', sector: 'Minier', segment: 'Premium', taxId: 'NIF-SMK-2024-006', address: 'Kindia Centre-Ville', city: 'Kindia', phone: '+224 628 66 66 06', email: 'logistique@smkindia.com' },
    { name: 'Pharmaguinée SARL', type: 'entreprise', sector: 'Pharmaceutique', segment: 'Standard', taxId: 'NIF-PHA-2024-007', address: 'Rue KA-020, Boulbinet', city: 'Conakry', phone: '+224 628 77 77 07', email: 'approvisionnement@pharmaguinee.com' },
    { name: 'Guinée Énergie SA', type: 'entreprise', sector: 'Énergie', segment: 'Premium', taxId: 'NIF-GES-2024-008', address: 'Cité des Affaires, Kaloum', city: 'Conakry', phone: '+224 628 88 88 08', email: 'supply@guinee-energie.com' },
    { name: 'BTP Guinée Construction', type: 'entreprise', sector: 'BTP', segment: 'Standard', taxId: 'NIF-BTP-2024-009', address: 'Zone Industrielle de Ratoma', city: 'Conakry', phone: '+224 628 99 99 09', email: 'materiaux@btpguinee.com' },
    { name: 'Guinée Alimentation SA', type: 'entreprise', sector: 'Alimentation', segment: 'Standard', taxId: 'NIF-GAS-2024-010', address: 'Marché de Madina', city: 'Conakry', phone: '+224 629 00 00 10', email: 'import@galimentation.com' },
  ]
  const clients = []
  for (const cd of clientsData) {
    const client = await prisma.client.create({ data: { ...cd, organizationId: org.id } })
    clients.push(client)
  }
  console.log('✅ Clients créés')

  // Client contacts
  const contactsData = [
    { clientId: clients[0].id, firstName: 'Abdoulaye', lastName: 'Diallo', position: 'Directeur Logistique', email: 'a.diallo@scg-gn.com', phone: '+224 621 11 00 01', isPrimary: true },
    { clientId: clients[0].id, firstName: 'Hawa', lastName: 'Camara', position: 'Assistante Import', email: 'h.camara@scg-gn.com', isPrimary: false },
    { clientId: clients[1].id, firstName: 'Moussa', lastName: 'Sow', position: 'Responsable Achats', email: 'm.sow@guineedistribution.com', phone: '+224 621 22 00 01', isPrimary: true },
    { clientId: clients[2].id, firstName: 'Lansana', lastName: 'Barry', position: 'Directeur Technique', email: 'l.barry@cimentguinee.com', phone: '+224 621 33 00 01', isPrimary: true },
    { clientId: clients[3].id, firstName: 'Fatou', lastName: 'Bangoura', position: 'Directrice Générale', email: 'f.bangoura@caiguinee.com', isPrimary: true },
    { clientId: clients[4].id, firstName: 'Sekouba', lastName: 'Konaté', position: 'Chef Supply Chain', email: 's.konate@gtelecom.gn', isPrimary: true },
    { clientId: clients[5].id, firstName: 'Youssouf', lastName: 'Diallo', position: 'Directeur des Opérations', email: 'y.diallo@smkindia.com', isPrimary: true },
    { clientId: clients[6].id, firstName: 'Aminata', lastName: 'Traoré', position: 'Pharmacienne', email: 'a.traore@pharmaguinee.com', isPrimary: true },
    { clientId: clients[7].id, firstName: 'Thierno', lastName: 'Baldé', position: 'Responsable Approvisionnement', email: 't.balde@guinee-energie.com', isPrimary: true },
    { clientId: clients[8].id, firstName: 'Mamadouba', lastName: 'Diané', position: 'Directeur des Travaux', email: 'm.diane@btpguinee.com', isPrimary: true },
    { clientId: clients[9].id, firstName: 'Kadiatou', lastName: 'Sow', position: 'Responsable Import', email: 'k.sow@galimentation.com', isPrimary: true },
  ]
  await prisma.clientContact.createMany({ data: contactsData })
  console.log('✅ Contacts clients créés')

  // Exchange rates
  await prisma.exchangeRate.createMany({
    data: [
      { organizationId: org.id, fromCurrency: 'USD', toCurrency: 'GNF', rate: 9850 },
      { organizationId: org.id, fromCurrency: 'EUR', toCurrency: 'GNF', rate: 10720 },
    ],
  })

  // 4. Cases
  const casesData = [
    // Maritime (12)
    { ref: 'IGS-2027-MAR-0001', type: 'maritime', direction: 'import', status: 'cloture', priority: 'normale', clientId: clients[0].id, chefId: p('chef_maritime').id, merch: 'Matériel informatique', weight: 12500, vol: 45, pkgCount: 320, value: 485000000, incoterm: 'CIF', supplier: 'TechSource Ltd', shipper: 'TechSource Ltd', consignee: 'SCG', origPort: 'Port d\'Anvers', destPort: 'Port Autonome de Conakry', eta: new Date('2027-06-15'), etd: new Date('2027-05-28'), ata: new Date('2027-06-14'), revenue: 18500000, cost: 12300000 },
    { ref: 'IGS-2027-MAR-0002', type: 'maritime', direction: 'import', status: 'livre', priority: 'normale', clientId: clients[1].id, chefId: p('chef_maritime').id, merch: 'Produits d\'entretien', weight: 8200, vol: 28, pkgCount: 180, value: 220000000, incoterm: 'FOB', supplier: 'CleanPro SARL', shipper: 'CleanPro SARL', consignee: 'Guinée Distribution', origPort: 'Port de Marseille', destPort: 'Port Autonome de Conakry', eta: new Date('2027-07-20'), etd: new Date('2027-07-05'), ata: new Date('2027-07-19'), revenue: 9800000, cost: 6500000 },
    { ref: 'IGS-2027-MAR-0003', type: 'maritime', direction: 'import', status: 'en_livraison', priority: 'haute', clientId: clients[2].id, chefId: p('chef_maritime').id, merch: 'Ciment Portland', weight: 45000, vol: 120, pkgCount: 900, value: 980000000, incoterm: 'CFR', supplier: 'CemEx International', shipper: 'CemEx International', consignee: 'CDG', origPort: 'Port de Rotterdam', destPort: 'Port Autonome de Conakry', eta: new Date('2027-07-28'), etd: new Date('2027-07-10'), ata: new Date('2027-07-27'), revenue: 32000000, cost: 21500000 },
    { ref: 'IGS-2027-MAR-0004', type: 'maritime', direction: 'import', status: 'en_dedouanement', priority: 'urgente', clientId: clients[3].id, chefId: p('chef_maritime').id, merch: 'Matières premières agroalimentaires', weight: 15600, vol: 52, pkgCount: 410, value: 340000000, incoterm: 'CIF', supplier: 'AgroTrade SA', shipper: 'AgroTrade SA', consignee: 'Conakry Agro', origPort: 'Port d\'Anvers', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-01'), etd: new Date('2027-07-15'), ata: new Date('2027-07-31'), revenue: 14200000, cost: 9800000 },
    { ref: 'IGS-2027-MAR-0005', type: 'maritime', direction: 'import', status: 'arrive_au_port', priority: 'normale', clientId: clients[4].id, chefId: p('chef_maritime').id, merch: 'Équipements télécoms', weight: 3200, vol: 18, pkgCount: 85, value: 750000000, incoterm: 'DAP', supplier: 'TelecomEquip GmbH', shipper: 'TelecomEquip GmbH', consignee: 'GTS', origPort: 'Port de Shanghai', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-03'), etd: new Date('2027-07-12'), ata: new Date('2027-08-02'), revenue: 28000000, cost: 18500000 },
    { ref: 'IGS-2027-MAR-0006', type: 'maritime', direction: 'import', status: 'en_transit', priority: 'haute', clientId: clients[5].id, chefId: p('chef_maritime').id, merch: 'Équipements miniers', weight: 28000, vol: 95, pkgCount: 42, value: 1200000000, incoterm: 'CIF', supplier: 'MiningTech Corp', shipper: 'MiningTech Corp', consignee: 'SMK', origPort: 'Port de Rotterdam', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-10'), etd: new Date('2027-07-20'), revenue: 45000000, cost: 31000000 },
    { ref: 'IGS-2027-MAR-0007', type: 'maritime', direction: 'import', status: 'documents_en_attente', priority: 'normale', clientId: clients[6].id, chefId: p('chef_maritime').id, merch: 'Produits pharmaceutiques', weight: 4500, vol: 22, pkgCount: 280, value: 520000000, incoterm: 'FOB', supplier: 'PharmaWorld Ltd', shipper: 'PharmaWorld Ltd', consignee: 'Pharmaguinée', origPort: 'Port de Marseille', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-08'), etd: new Date('2027-07-22'), revenue: 16500000, cost: 11200000 },
    { ref: 'IGS-2027-MAR-0008', type: 'maritime', direction: 'import', status: 'en_preparation', priority: 'normale', clientId: clients[7].id, chefId: p('chef_maritime').id, merch: 'Transformateurs électriques', weight: 18000, vol: 65, pkgCount: 12, value: 890000000, incoterm: 'CIF', supplier: 'PowerEquip SA', shipper: 'PowerEquip SA', consignee: 'Guinée Énergie', origPort: 'Port d\'Anvers', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-15'), etd: new Date('2027-07-25'), revenue: 35000000, cost: 24000000 },
    { ref: 'IGS-2027-MAR-0009', type: 'maritime', direction: 'export', status: 'dossier_ouvert', priority: 'normale', clientId: clients[5].id, chefId: p('chef_maritime').id, merch: 'Minerais de bauxite', weight: 52000, vol: 200, pkgCount: 800, value: 2000000000, incoterm: 'FOB', supplier: 'SMK', shipper: 'SMK', consignee: 'AluCorp China', origPort: 'Port Autonome de Conakry', destPort: 'Port de Shanghai', eta: new Date('2027-08-20'), etd: new Date('2027-08-18'), revenue: 38000000, cost: 22000000 },
    { ref: 'IGS-2027-MAR-0010', type: 'maritime', direction: 'import', status: 'suspendu', priority: 'critique', clientId: clients[8].id, chefId: p('chef_maritime').id, merch: 'Matériaux de construction', weight: 35000, vol: 110, pkgCount: 550, value: 420000000, incoterm: 'CFR', supplier: 'BuildMat SA', shipper: 'BuildMat SA', consignee: 'BTP Guinée', origPort: 'Port d\'Abidjan', destPort: 'Port Autonome de Conakry', eta: new Date('2027-07-25'), etd: new Date('2027-07-12'), ata: new Date('2027-07-26'), revenue: 15000000, cost: 10500000 },
    { ref: 'IGS-2027-MAR-0011', type: 'maritime', direction: 'import', status: 'devis_envoye', priority: 'normale', clientId: clients[9].id, chefId: p('chef_maritime').id, merch: 'Produits alimentaires', weight: 22000, vol: 78, pkgCount: 640, value: 180000000, incoterm: 'CIF', supplier: 'FoodImport SARL', shipper: 'FoodImport SARL', consignee: 'Guinée Alimentation', origPort: 'Port de Dakar', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-20'), etd: new Date('2027-08-08'), revenue: 11500000, cost: 7800000 },
    { ref: 'IGS-2027-MAR-0012', type: 'maritime', direction: 'import', status: 'en_attente_paiement', priority: 'haute', clientId: clients[0].id, chefId: p('chef_maritime').id, merch: 'Pièces détachées automobiles', weight: 6800, vol: 25, pkgCount: 150, value: 350000000, incoterm: 'FOB', supplier: 'AutoParts International', shipper: 'AutoParts International', consignee: 'SCG', origPort: 'Port de Rotterdam', destPort: 'Port Autonome de Conakry', eta: new Date('2027-08-05'), etd: new Date('2027-07-18'), ata: new Date('2027-08-04'), revenue: 12500000, cost: 8200000 },
    // Aérien (6)
    { ref: 'IGS-2027-AER-0001', type: 'aerien', direction: 'import', status: 'livre', priority: 'urgente', clientId: clients[6].id, chefId: p('chef_aerien').id, merch: 'Médicaments urgents', weight: 850, vol: 4, pkgCount: 24, value: 180000000, incoterm: 'DAP', supplier: 'MedSupply Europe', shipper: 'MedSupply Europe', consignee: 'Pharmaguinée', origPort: 'Paris CDG', destPort: 'Aéroport AKST', eta: new Date('2027-07-28'), etd: new Date('2027-07-27'), ata: new Date('2027-07-28'), revenue: 8500000, cost: 5200000 },
    { ref: 'IGS-2027-AER-0002', type: 'aerien', direction: 'import', status: 'en_livraison', priority: 'critique', clientId: clients[4].id, chefId: p('chef_aerien').id, merch: 'Composants électroniques', weight: 320, vol: 2, pkgCount: 8, value: 450000000, incoterm: 'DDP', supplier: 'ElecParts HK', shipper: 'ElecParts HK', consignee: 'GTS', origPort: 'Istanbul IST', destPort: 'Aéroport AKST', eta: new Date('2027-08-01'), etd: new Date('2027-07-31'), ata: new Date('2027-08-01'), revenue: 12000000, cost: 7500000 },
    { ref: 'IGS-2027-AER-0003', type: 'aerien', direction: 'import', status: 'en_dedouanement', priority: 'urgente', clientId: clients[5].id, chefId: p('chef_aerien').id, merch: 'Pièces de rechange minier', weight: 1200, vol: 6, pkgCount: 15, value: 680000000, incoterm: 'CIF', supplier: 'MineParts Co', shipper: 'MineParts Co', consignee: 'SMK', origPort: 'Paris CDG', destPort: 'Aéroport AKST', eta: new Date('2027-08-02'), etd: new Date('2027-08-01'), ata: new Date('2027-08-02'), revenue: 9500000, cost: 6200000 },
    { ref: 'IGS-2027-AER-0004', type: 'aerien', direction: 'import', status: 'dossier_ouvert', priority: 'haute', clientId: clients[7].id, chefId: p('chef_aerien').id, merch: 'Transformateurs de puissance', weight: 2500, vol: 12, pkgCount: 4, value: 920000000, incoterm: 'FOB', supplier: 'PowerTech GmbH', shipper: 'PowerTech GmbH', consignee: 'Guinée Énergie', origPort: 'Bruxelles BRU', destPort: 'Aéroport AKST', eta: new Date('2027-08-06'), etd: new Date('2027-08-05'), revenue: 18000000, cost: 11500000 },
    { ref: 'IGS-2027-AER-0005', type: 'aerien', direction: 'export', status: 'documents_conformes', priority: 'normale', clientId: clients[3].id, chefId: p('chef_aerien').id, merch: 'Produits agricoles transformés', weight: 600, vol: 3, pkgCount: 20, value: 120000000, incoterm: 'FOB', supplier: 'Conakry Agro', shipper: 'Conakry Agro', consignee: 'EuroFood SA', origPort: 'Aéroport AKST', destPort: 'Paris CDG', eta: new Date('2027-08-08'), etd: new Date('2027-08-07'), revenue: 6500000, cost: 3800000 },
    { ref: 'IGS-2027-AER-0006', type: 'aerien', direction: 'import', status: 'cloture', priority: 'normale', clientId: clients[0].id, chefId: p('chef_aerien').id, merch: 'Échantillons commerciaux', weight: 50, vol: 0.5, pkgCount: 3, value: 15000000, incoterm: 'EXW', supplier: 'SampleTech Ltd', shipper: 'SampleTech Ltd', consignee: 'SCG', origPort: 'Casablanca CMN', destPort: 'Aéroport AKST', eta: new Date('2027-07-10'), etd: new Date('2027-07-09'), ata: new Date('2027-07-10'), revenue: 2800000, cost: 1500000 },
    // Terrestre (5)
    { ref: 'IGS-2027-TER-0001', type: 'terrestre', direction: 'import', status: 'livre', priority: 'normale', clientId: clients[2].id, chefId: p('chef_maritime').id, merch: 'Additifs ciment', weight: 8000, vol: 30, pkgCount: 200, value: 85000000, incoterm: 'DAP', supplier: 'ChemAdd SARL', shipper: 'ChemAdd SARL', consignee: 'CDG', origPort: 'Conakry', destPort: 'Usine Dubréka', revenue: 3200000, cost: 2100000 },
    { ref: 'IGS-2027-TER-0002', type: 'terrestre', direction: 'transit', status: 'en_transit', priority: 'haute', clientId: clients[8].id, chefId: p('chef_maritime').id, merch: 'Matériaux de construction', weight: 15000, vol: 55, pkgCount: 300, value: 280000000, incoterm: 'FCA', supplier: 'MatCon SARL', shipper: 'MatCon SARL', consignee: 'BTP Guinée', origPort: 'Conakry', destPort: 'Kamsar', eta: new Date('2027-08-04'), revenue: 4500000, cost: 3200000 },
    { ref: 'IGS-2027-TER-0003', type: 'terrestre', direction: 'import', status: 'livre', priority: 'normale', clientId: clients[9].id, chefId: p('chef_maritime').id, merch: 'Produits alimentaires périssables', weight: 5000, vol: 22, pkgCount: 120, value: 65000000, incoterm: 'DAP', supplier: 'FreshFood Conakry', shipper: 'FreshFood Conakry', consignee: 'Guinée Alimentation', origPort: 'Conakry', destPort: 'Entrepôt Madina', revenue: 1800000, cost: 1200000 },
    { ref: 'IGS-2027-TER-0004', type: 'terrestre', direction: 'transit', status: 'en_transit', priority: 'normale', clientId: clients[5].id, chefId: p('chef_maritime').id, merch: 'Équipements miniers légers', weight: 6000, vol: 20, pkgCount: 35, value: 150000000, incoterm: 'FCA', supplier: 'MineEquip Ltd', shipper: 'MineEquip Ltd', consignee: 'SMK', origPort: 'Conakry', destPort: 'Kindia', eta: new Date('2027-08-05'), revenue: 2800000, cost: 1900000 },
    { ref: 'IGS-2027-TER-0005', type: 'terrestre', direction: 'import', status: 'assigne', priority: 'haute', clientId: clients[1].id, chefId: p('chef_maritime').id, merch: 'Produits d\'hygiène', weight: 3500, vol: 15, pkgCount: 90, value: 45000000, incoterm: 'DAP', supplier: 'HygienePro SARL', shipper: 'HygienePro SARL', consignee: 'Guinée Distribution', origPort: 'Conakry', destPort: 'Entrepôt Almamya', revenue: 1500000, cost: 950000 },
    // Multimodal (2)
    { ref: 'IGS-2027-MUL-0001', type: 'multimodal', direction: 'import', status: 'en_dedouanement', priority: 'critique', clientId: clients[7].id, chefId: p('chef_maritime').id, merch: 'Panels solaires et onduleurs', weight: 9500, vol: 38, pkgCount: 65, value: 1100000000, incoterm: 'DDP', supplier: 'SolarTech GmbH', shipper: 'SolarTech GmbH', consignee: 'Guinée Énergie', origPort: 'Hamburg', destPort: 'Conakry', eta: new Date('2027-08-03'), etd: new Date('2027-07-18'), ata: new Date('2027-08-02'), revenue: 42000000, cost: 28500000 },
    { ref: 'IGS-2027-MUL-0002', type: 'multimodal', direction: 'import', status: 'documents_en_attente', priority: 'haute', clientId: clients[4].id, chefId: p('chef_maritime').id, merch: 'Fibre optique et équipements réseau', weight: 4200, vol: 16, pkgCount: 48, value: 680000000, incoterm: 'CIF', supplier: 'FiberNet International', shipper: 'FiberNet International', consignee: 'GTS', origPort: 'Shenzhen', destPort: 'Conakry', eta: new Date('2027-08-12'), etd: new Date('2027-07-25'), revenue: 25000000, cost: 17000000 },
  ]

  const cases: any[] = []
  for (const cd of casesData) {
    const c = await prisma.case.create({
      data: {
        organizationId: org.id,
        reference: cd.ref,
        type: cd.type,
        direction: cd.direction,
        status: cd.status,
        priority: cd.priority,
        clientId: cd.clientId,
        serviceChefId: cd.chefId,
        commercialId: p('commercial')?.id || p('agent').id,
        description: `Dossier ${cd.ref} - ${cd.merch}`,
        merchandise: cd.merch,
        weightKg: cd.weight,
        volumeM3: cd.vol,
        packageCount: cd.pkgCount,
        declaredValue: cd.value,
        declaredCurrency: 'GNF',
        incoterm: cd.incoterm,
        supplier: cd.supplier,
        shipper: cd.shipper,
        consignee: cd.consignee,
        originPort: cd.origPort,
        destinationPort: cd.destPort,
        eta: cd.eta || null,
        etd: cd.etd || null,
        ata: cd.ata || null,
        estimatedRevenue: cd.revenue,
        estimatedCost: cd.cost,
        currency: 'GNF',
        riskLevel: cd.priority === 'critique' ? 'eleve' : cd.priority === 'urgente' ? 'moyen' : 'faible',
      },
    })
    cases.push(c)
  }
  console.log(`✅ ${cases.length} dossiers créés`)

  // 5. Shipments (for maritime cases)
  const maritimeCases = cases.filter((c) => c.type === 'maritime')
  const vesselNames = ['MSC Rania', 'CMA CGM Chopin', 'MAERSK Elba', 'Hapag-Lloyd Express', 'COSCO Harmony', 'Ever Given', 'PACIFIC Star', 'ONE Triumph', 'Yang Ming Unity', 'Safmarine Nomad', 'MAERSK Seletar', 'CMA CGM Verlaine']
  const blNumbers = ['MAEU123456789', 'CMAU987654321', 'MSKU456789123', 'HLCU789123456', 'CSLU321654987', 'EGLV654987321', 'OOLU987321654', 'YMLU321987654', 'SAFU654321987', 'MAEU147258369', 'CMAU369258147', 'MSKU258147369']
  const shippingLines = ['MAERSK', 'CMA CGM', 'MSC', 'Hapag-Lloyd', 'COSCO', 'Evergreen', 'ONE', 'Yang Ming', 'Safmarine', 'MAERSK', 'CMA CGM', 'MSC']

  for (let i = 0; i < maritimeCases.length; i++) {
    const mc = maritimeCases[i]
    const shipment = await prisma.shipment.create({
      data: {
        caseId: mc.id,
        vesselName: vesselNames[i],
        voyageNumber: `${vesselNames[i].split(' ')[1]}${2707 + Math.floor(i / 3)}`,
        blNumber: blNumbers[i],
        shippingLine: shippingLines[i],
        loadingPort: mc.originPort,
        dischargePort: mc.destinationPort,
        terminal: ['TCG', 'Terminal Minéralier', 'TCG', 'TCG', 'Terminal Minéralier', 'TCG', 'TCG', 'TCG', 'TCG', 'TCG', 'TCG', 'TCG'][i],
        freeTimeEndsAt: mc.ata ? new Date(mc.ata.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        containerReturnDeadline: mc.ata ? new Date(mc.ata.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
        terminalFees: 150000 + Math.random() * 500000,
        demurrageFees: mc.status === 'suspendu' ? 350000 : 0,
      },
    })
    // 1-2 containers per shipment
    const containerCount = 1 + Math.floor(Math.random() * 2)
    const sizes = ['20ft', '40ft', '40hc']
    const containerTypes = ['standard', 'high_cube', 'reefer']
    for (let j = 0; j < containerCount; j++) {
      await prisma.container.create({
        data: {
          shipmentId: shipment.id,
          containerNumber: `MSCU${String(1000000 + i * 10 + j).padStart(7, '0')}`,
          size: sizes[Math.floor(Math.random() * 3)],
          type: containerTypes[Math.floor(Math.random() * 3)],
          status: ['en_transit', 'arrive', 'decharge', 'vide', 'retourne'][Math.min(4, Math.floor(Math.random() * 5))],
          sealNumber: `SEAL-${String(10000 + i * 10 + j)}`,
          grossWeight: 5000 + Math.random() * 20000,
        },
      })
    }
  }
  console.log('✅ Expéditions maritimes et conteneurs créés')

  // 6. Flights (for aerien cases)
  const aerienCases = cases.filter((c) => c.type === 'aerien')
  const flightData = [
    { awb: '057-12345678', airline: 'Air France', flight: 'AF728', dep: 'Paris CDG', arr: 'Conakry AKST', depTime: '2027-07-27T10:30:00', arrTime: '2027-07-28T15:45:00' },
    { awb: '235-98765432', airline: 'Turkish Airlines', flight: 'TK531', dep: 'Istanbul IST', arr: 'Conakry AKST', depTime: '2027-07-31T02:15:00', arrTime: '2027-08-01T08:30:00' },
    { awb: '057-45678901', airline: 'Air France', flight: 'AF728', dep: 'Paris CDG', arr: 'Conakry AKST', depTime: '2027-08-01T10:30:00', arrTime: '2027-08-02T15:45:00' },
    { awb: '082-23456789', airline: 'Brussels Airlines', flight: 'SN357', dep: 'Bruxelles BRU', arr: 'Conakry AKST', depTime: '2027-08-05T12:00:00', arrTime: '2027-08-06T17:20:00' },
    { awb: '057-67890123', airline: 'Air France', flight: 'AF729', dep: 'Conakry AKST', arr: 'Paris CDG', depTime: '2027-08-07T22:00:00', arrTime: '2027-08-08T06:30:00' },
    { awb: '057-11112222', airline: 'Royal Air Maroc', flight: 'AT553', dep: 'Casablanca CMN', arr: 'Conakry AKST', depTime: '2027-07-09T14:00:00', arrTime: '2027-07-10T18:15:00' },
  ]
  for (let i = 0; i < aerienCases.length; i++) {
    const fd = flightData[i]
    await prisma.flight.create({
      data: {
        caseId: aerienCases[i].id,
        awbNumber: fd.awb,
        airline: fd.airline,
        flightNumber: fd.flight,
        departureAirport: fd.dep,
        arrivalAirport: fd.arr,
        departureTime: new Date(fd.depTime),
        arrivalTime: new Date(fd.arrTime),
        grossWeightKg: aerienCases[i].weightKg,
        netWeightKg: (aerienCases[i].weightKg || 100) * 0.85,
        packageCount: aerienCases[i].packageCount,
        natureOfGoods: aerienCases[i].merchandise,
      },
    })
  }
  console.log('✅ Vols aériens créés')

  // 7. Transport missions (for terrestre cases)
  const terrestreCases = cases.filter((c) => c.type === 'terrestre')
  const missionData = [
    { status: 'livre', driver: 'Aboubacar Sidibé', phone: '+224 625 00 01', plate: 'GN-1234-AB', transporter: 'TransExpress GN', pickup: 'Port Autonome de Conakry', delivery: 'Usine CDG Dubréka', schedDate: '2027-07-15' },
    { status: 'en_transit', driver: 'Mouctar Diallo', phone: '+224 625 00 02', plate: 'GN-5678-CD', transporter: 'LogiTrans SARL', pickup: 'Entrepôt Conakry', delivery: 'Kamsar', schedDate: '2027-08-02' },
    { status: 'livre', driver: 'Samba Bangoura', phone: '+224 625 00 03', plate: 'GN-9012-EF', transporter: 'FroidExpress', pickup: 'Aéroport AKST', delivery: 'Entrepôt Madina', schedDate: '2027-07-20' },
    { status: 'en_transit', driver: 'Ibrahima Keita', phone: '+224 625 00 04', plate: 'GN-3456-GH', transporter: 'MineTrans GN', pickup: 'Conakry', delivery: 'Kindia', schedDate: '2027-08-03' },
    { status: 'assigne', driver: 'Alpha Condé', phone: '+224 625 00 05', plate: 'GN-7890-IJ', transporter: 'TransExpress GN', pickup: 'Port TCG', delivery: 'Almamya', schedDate: '2027-08-05' },
  ]
  for (let i = 0; i < terrestreCases.length; i++) {
    const md = missionData[i]
    await prisma.transportMission.create({
      data: {
        organizationId: org.id,
        caseId: terrestreCases[i].id,
        type: 'livraison',
        status: md.status,
        vehiclePlate: md.plate,
        driverName: md.driver,
        driverPhone: md.phone,
        transporter: md.transporter,
        pickupAddress: md.pickup,
        deliveryAddress: md.delivery,
        scheduledDate: new Date(md.schedDate),
        completedDate: md.status === 'livre' ? new Date(md.schedDate) : null,
      },
    })
  }
  console.log('✅ Missions de transport créées')

  // 8. Customs declarations
  const casesNeedingCustoms = cases.filter((c) =>
    !['brouillon', 'devis_en_preparation', 'devis_envoye', 'commande_confirme', 'devis_envoye', 'annule'].includes(c.status) && c.direction !== 'export'
  )
  const customsStatuses = ['mainlevee', 'mainlevee', 'paiement', 'controle', 'deposee', 'deposee', 'circuit', 'preparation', 'preparation', 'rejet', 'mainlevee', 'deposee', 'preparation', 'mainlevee', 'circuit', 'mainlevee', 'deposee', 'preparation', 'mainlevee', 'mainlevee', 'mainlevee', 'mainlevee']
  for (let i = 0; i < Math.min(casesNeedingCustoms.length, customsStatuses.length); i++) {
    const decl = await prisma.customsDeclaration.create({
      data: {
        caseId: casesNeedingCustoms[i].id,
        regime: casesNeedingCustoms[i].direction,
        status: customsStatuses[i],
        declarationNumber: `DD-${String(2027000 + i).padStart(7, '0')}`,
        gucegRef: `GUCEG-${String(2027000 + i).padStart(7, '0')}`,
        sydoniaRef: `SYD-${String(2027000 + i).padStart(7, '0')}`,
        integrationMode: 'manuel',
        submittedAt: !['preparation'].includes(customsStatuses[i]) ? new Date('2027-07-20') : null,
        clearedAt: customsStatuses[i] === 'mainlevee' ? new Date('2027-07-25') : null,
        releaseNoteNumber: customsStatuses[i] === 'mainlevee' ? `ML-${String(1000 + i)}` : null,
      },
    })
    // Add some events
    if (customsStatuses[i] !== 'preparation') {
      await prisma.customsEvent.create({
        data: { declarationId: decl.id, eventType: 'depot', description: 'Déclaration déposée au bureau de douane', performedById: p('declarant').id },
      })
    }
    if (['circuit', 'controle', 'paiement', 'mainlevee'].includes(customsStatuses[i])) {
      await prisma.customsEvent.create({
        data: { declarationId: decl.id, eventType: 'circuit', description: 'Dossier en circuit de vérification', performedById: p('declarant').id },
      })
    }
    if (['mainlevee'].includes(customsStatuses[i])) {
      await prisma.customsEvent.create({
        data: { declarationId: decl.id, eventType: 'mainlevee', description: 'Mainlevée accordée par le bureau des douanes', performedById: p('declarant').id },
      })
    }
    if (customsStatuses[i] === 'rejet') {
      await prisma.customsEvent.create({
        data: { declarationId: decl.id, eventType: 'rejet', description: 'Rejet pour document manquant - certificat d\'origine absent', performedById: p('declarant').id },
      })
    }
  }
  console.log('✅ Déclarations douanières créées')

  // 9. Documents
  const docData = []
  for (let i = 0; i < 12; i++) {
    docData.push({ caseId: cases[i].id, name: `BL-${blNumbers[i] || 'GEN' + i}.pdf`, category: 'bl', status: 'conforme' })
    docData.push({ caseId: cases[i].id, name: `Facture_commerciale_${cases[i].reference}.pdf`, category: 'facture_commerciale', status: 'conforme' })
    docData.push({ caseId: cases[i].id, name: `Packing_List_${cases[i].reference}.pdf`, category: 'packing_list', status: i < 10 ? 'conforme' : 'en_verification' })
  }
  for (let i = 0; i < 6; i++) {
    docData.push({ caseId: cases[i].id, name: `Certificat_origine_${cases[i].reference}.pdf`, category: 'certificat_origine', status: i < 5 ? 'conforme' : 'non_conforme' })
  }
  for (const dd of docData) {
    await prisma.document.create({
      data: {
        organizationId: org.id,
        caseId: dd.caseId,
        name: dd.name,
        category: dd.category,
        status: dd.status,
        fileType: 'application/pdf',
        fileSize: 150000 + Math.floor(Math.random() * 500000),
      },
    })
  }
  console.log(`✅ ${docData.length} documents créés`)

  // 10. Expense requests
  const expenseData = [
    { caseId: cases[0].id, amount: 2500000, desc: 'Droits de douane - Matériel informatique', vendor: 'Direction Générale des Douanes', vendorType: 'douane', cat: 'droits_taxes', status: 'paye' },
    { caseId: cases[1].id, amount: 1800000, desc: 'Frais de manutention portuaire', vendor: 'TCG - Terminal', vendorType: 'terminal', cat: 'frais_terminal', status: 'paye' },
    { caseId: cases[2].id, amount: 8500000, desc: 'Droits de douane - Ciment Portland', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'approuve' },
    { caseId: cases[3].id, amount: 3200000, desc: 'Droits de douane - Produits agroalimentaires', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'en_validation' },
    { caseId: cases[4].id, amount: 1500000, desc: 'Frais de terminal et manutention', vendor: 'TCG', vendorType: 'terminal', cat: 'frais_terminal', status: 'soumis' },
    { caseId: cases[5].id, amount: 12000000, desc: 'Droits de douane - Équipements miniers', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'en_validation' },
    { caseId: cases[9].id, amount: 4500000, desc: 'Surestaries conteneur - Retard déchargement', vendor: 'TCG', vendorType: 'terminal', cat: 'surestarie', status: 'paye' },
    { caseId: cases[11].id, amount: 2800000, desc: 'Droits de douane - Pièces automobiles', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'approuve' },
    { caseId: cases[12].id, amount: 500000, desc: 'Transport aéroport - Médicaments urgents', vendor: 'ExpressTrans GN', vendorType: 'transport', cat: 'transport', status: 'paye' },
    { caseId: cases[13].id, amount: 750000, desc: 'Traitement fret aérien prioritaire', vendor: 'Handling AKST', vendorType: 'autre', cat: 'autre', status: 'paye' },
    { caseId: cases[14].id, amount: 3500000, desc: 'Droits de douane - Pièces mines', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'en_validation' },
    { caseId: cases[0].id, amount: 800000, desc: 'Transport port-usine', vendor: 'TransExpress GN', vendorType: 'transport', cat: 'transport', status: 'paye' },
    { caseId: cases[2].id, amount: 2200000, desc: 'Frais de livraison longue distance', vendor: 'LogiTrans SARL', vendorType: 'transport', cat: 'transport', status: 'soumis' },
    { caseId: cases[6].id, amount: 1800000, desc: 'Contrôle qualité pharmaceutique', vendor: 'LaboControl GN', vendorType: 'autre', cat: 'autre', status: 'rejete', rejectionReason: 'Montant non justifié - facture illisible' },
    { caseId: cases[24].id, amount: 5000000, desc: 'Droits de douane - Panneaux solaires', vendor: 'DGD', vendorType: 'douane', cat: 'droits_taxes', status: 'approuve' },
  ]
  for (const ed of expenseData) {
    const expense = await prisma.expenseRequest.create({
      data: {
        organizationId: org.id,
        caseId: ed.caseId,
        requesterId: p('agent').id,
        amount: ed.amount,
        amountGnf: ed.amount,
        description: ed.desc,
        vendor: ed.vendor,
        vendorType: ed.vendorType,
        category: ed.cat,
        status: ed.status,
        rejectionReason: ed.rejectionReason || null,
        approvedById: ['approuve', 'paye', 'justifie', 'rapproche'].includes(ed.status) ? p('daf').id : null,
        approvedAt: ['approuve', 'paye', 'justifie', 'rapproche'].includes(ed.status) ? new Date('2027-07-22') : null,
      },
    })
    if (['approuve', 'paye'].includes(ed.status)) {
      await prisma.expenseApproval.create({
        data: { expenseId: expense.id, approverId: p('daf').id, level: 1, status: 'approuve', decidedAt: new Date('2027-07-22') },
      })
    }
    if (ed.status === 'en_validation') {
      await prisma.expenseApproval.create({
        data: { expenseId: expense.id, approverId: p('daf').id, level: 1, status: 'en_attente' },
      })
    }
  }
  console.log(`✅ ${expenseData.length} demandes de débours créées`)

  // 11. Invoices
  const invoiceData = [
    { caseId: cases[0].id, clientId: clients[0].id, num: 'FAC-2027-0001', status: 'payee', total: 18500000, tax: 3330000, net: 21830000, dueDate: '2027-07-15', paidAmt: 21830000 },
    { caseId: cases[1].id, clientId: clients[1].id, num: 'FAC-2027-0002', status: 'payee', total: 9800000, tax: 1764000, net: 11564000, dueDate: '2027-08-10', paidAmt: 11564000 },
    { caseId: cases[2].id, clientId: clients[2].id, num: 'FAC-2027-0003', status: 'envoyee', total: 32000000, tax: 5760000, net: 37760000, dueDate: '2027-08-25', paidAmt: 0 },
    { caseId: cases[3].id, clientId: clients[3].id, num: 'FAC-2027-0004', status: 'echue', total: 14200000, tax: 2556000, net: 16756000, dueDate: '2027-07-30', paidAmt: 5000000 },
    { caseId: cases[4].id, clientId: clients[4].id, num: 'FAC-2027-0005', status: 'emise', total: 28000000, tax: 5040000, net: 33040000, dueDate: '2027-09-01', paidAmt: 0 },
    { caseId: cases[9].id, clientId: clients[8].id, num: 'FAC-2027-0006', status: 'echue', total: 15000000, tax: 2700000, net: 17700000, dueDate: '2027-07-20', paidAmt: 0 },
    { caseId: cases[12].id, clientId: clients[6].id, num: 'FAC-2027-0007', status: 'payee', total: 8500000, tax: 1530000, net: 10030000, dueDate: '2027-08-05', paidAmt: 10030000 },
    { caseId: cases[13].id, clientId: clients[4].id, num: 'FAC-2027-0008', status: 'envoyee', total: 12000000, tax: 2160000, net: 14160000, dueDate: '2027-09-10', paidAmt: 0 },
    { caseId: cases[5].id, clientId: clients[5].id, num: 'FAC-2027-0009', status: 'brouillon', total: 45000000, tax: 8100000, net: 53100000, dueDate: '2027-09-15', paidAmt: 0 },
    { caseId: cases[24].id, clientId: clients[7].id, num: 'FAC-2027-0010', status: 'partiellement_payee', total: 42000000, tax: 7560000, net: 49560000, dueDate: '2027-08-20', paidAmt: 20000000 },
    { caseId: cases[0].id, clientId: clients[0].id, num: 'FAC-2027-0011', status: 'emise', total: 12500000, tax: 2250000, net: 14750000, dueDate: '2027-09-05', paidAmt: 0 },
    { caseId: cases[1].id, clientId: clients[1].id, num: 'FAC-2027-0012', status: 'annulee', total: 5000000, tax: 900000, net: 5900000, dueDate: '2027-08-01', paidAmt: 0 },
  ]
  const serviceLines = ['Prestation logistique complète', 'Dédouanement import', 'Manutention portuaire', 'Transport et livraison', 'Frais de dossier', 'Suivi documentaire', 'Gestion douanière', 'Fret aérien']
  for (const inv of invoiceData) {
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        caseId: inv.caseId,
        clientId: inv.clientId,
        invoiceNumber: inv.num,
        status: inv.status,
        issuedAt: new Date('2027-07-15'),
        dueDate: new Date(inv.dueDate),
        paidAmount: inv.paidAmt,
        totalAmount: inv.total,
        currency: 'GNF',
        taxRate: 18,
        taxAmount: inv.tax,
        netAmount: inv.net,
      },
    })
    // 2-3 items per invoice
    const itemCount = 2 + Math.floor(Math.random() * 2)
    for (let j = 0; j < itemCount; j++) {
      const lineTotal = Math.round(inv.total / itemCount)
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: serviceLines[j % serviceLines.length],
          quantity: 1,
          unitPrice: lineTotal,
          total: lineTotal,
        },
      })
    }
    // Payment for paid invoices
    if (inv.status === 'payee') {
      await prisma.payment.create({
        data: {
          organizationId: org.id,
          invoiceId: invoice.id,
          clientId: inv.clientId,
          amount: inv.net,
          currency: 'GNF',
          method: 'virement',
          reference: `VIR-${inv.num}`,
          status: 'confirme',
          confirmedById: p('comptable').id,
          confirmedAt: new Date('2027-07-20'),
        },
      })
    }
    if (inv.status === 'partiellement_payee') {
      await prisma.payment.create({
        data: {
          organizationId: org.id,
          invoiceId: invoice.id,
          clientId: inv.clientId,
          amount: inv.paidAmt,
          currency: 'GNF',
          method: 'virement',
          reference: `VIR-PART-${inv.num}`,
          status: 'confirme',
          confirmedById: p('comptable').id,
          confirmedAt: new Date('2027-07-28'),
        },
      })
    }
  }
  console.log(`✅ ${invoiceData.length} factures créées avec lignes et paiements`)

  // 12. Incidents
  const incidentData = [
    { caseId: cases[9].id, title: 'Retard de livraison - Blocage au port', desc: 'Le conteneur est bloqué au terminal TCG depuis 5 jours suite à un problème de surestarie non résolue. Le client BTP Guinée exige une livraison urgente.', type: 'retard', severity: 'eleve', status: 'en_cours' },
    { caseId: cases[12].id, title: 'Document manquant - AWB incomplet', desc: 'L\'AWB 057-12345678 ne comporte pas le poids brut correct. Le dossier est en attente de correction auprès de la compagnie aérienne.', type: 'document_incomplet', severity: 'moyen', status: 'resolu', resolution: 'AWB corrigé et renvoyé par Air France le 28/07.' },
    { caseId: cases[16].id, title: 'Panne véhicule en cours de livraison', desc: 'Le camion GN-5678-CD a subi une panne moteur sur la route nationale N3 entre Conakry et Kamsar. Le chargement de matériaux est immobilisé.', type: 'accident', severity: 'critique', status: 'ouvert' },
    { caseId: cases[11].id, title: 'Attente de paiement client', desc: 'Le client SCG n\'a pas encore réglé les droits de douane pour les pièces détachées automobiles. La mainlevée est bloquée.', type: 'paiement', severity: 'moyen', status: 'en_cours' },
    { caseId: cases[0].id, title: 'Dommage conteneur constaté au déchargement', desc: 'Le conteneur MSCU1000000 présente une déformation latérale constatée lors du déchargement au TCG. Une inspection est nécessaire.', type: 'dommage', severity: 'eleve', status: 'ouvert' },
  ]
  for (const ind of incidentData) {
    await prisma.incident.create({
      data: {
        organizationId: org.id,
        caseId: ind.caseId,
        title: ind.title,
        description: ind.desc,
        type: ind.type,
        severity: ind.severity,
        status: ind.status,
        assignedToId: p('chef_maritime').id,
        resolvedAt: ind.status === 'resolu' ? new Date('2027-07-28') : null,
        resolution: ind.resolution || null,
      },
    })
  }
  console.log('✅ Incidents créés')

  // 13. Comments
  const commentTexts = [
    'Le client a été informé de l\'avancée du dédouanement. Prévoir la livraison pour demain.',
    'Documents reçus et vérifiés. Tout est conforme pour la déclaration en douane.',
    'Urgence confirmée par la direction. Priorité maximale sur ce dossier.',
    'Le navire MSC Rania a quitté le port d\'Anvers avec 24h de retard. ETA révisé.',
    'Paiement client reçu et confirmé. Procédure de mainlevée lancée.',
    'Le chauffeur est en route. Livraison prévue avant 17h.',
    'Réunion de suivi avec le client SMK prévue demain à 10h.',
    'Facture envoyée par email au client. Relance prévue le 05/08.',
    'Le déclarant a déposé le dossier au bureau de douane ce matin.',
    'Conteneur déchargé au TCG. En attente de vérification physique.',
  ]
  for (let i = 0; i < commentTexts.length; i++) {
    await prisma.comment.create({
      data: {
        organizationId: org.id,
        caseId: cases[i % cases.length].id,
        profileId: allProfiles[i % allProfiles.length].id,
        content: commentTexts[i],
        isInternal: true,
      },
    })
  }
  console.log('✅ Commentaires créés')

  // 14. Notifications
  const notifData = [
    { title: 'Dossier urgent - Traitement prioritaire', message: 'Le dossier IGS-2027-AER-0002 (Composants électroniques) est marqué critique. Traitement sous 24h requis.', type: 'alerte', cat: 'dossier' },
    { title: 'Facture échue - SCG', message: 'La facture FAC-2027-0004 de 16,8M GNF est échue depuis le 30/07. Relance client recommandée.', type: 'avertissement', cat: 'paiement' },
    { title: 'Mainlevée obtenue - Ciment de Guinée', message: 'La mainlevée douanière a été accordée pour le dossier IGS-2027-MAR-003. La sortie peut être programmée.', type: 'succes', cat: 'dossier' },
    { title: 'Nouveau incident critique', message: 'Panne véhicule sur la route N3 (IGS-2027-TER-0002). Chargement immobilisé. Intervention urgente nécessaire.', type: 'alerte', cat: 'incident' },
    { title: 'Document non conforme détecté', message: 'Le certificat d\'origine du dossier IGS-2027-MAR-0007 est non conforme. Action corrective requise.', type: 'avertissement', cat: 'document' },
    { title: 'Paiement reçu - Pharmaguinée', message: 'Le paiement de 10M GNF a été reçu pour la facture FAC-2027-0007.', type: 'succes', cat: 'paiement' },
    { title: 'ETA imminent - Équipements télécoms', message: 'Le navire MSC Rania (IGS-2027-MAR-0005) arrive demain au PAC. Préparer les opérations de déchargement.', type: 'info', cat: 'dossier' },
    { title: 'Débours en attente de validation', message: '3 demandes de débours sont en attente de validation par le DAF pour un montant total de 18,7M GNF.', type: 'avertissement', cat: 'paiement' },
  ]
  for (const nd of notifData) {
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        title: nd.title,
        message: nd.message,
        type: nd.type,
        category: nd.cat,
        isRead: false,
      },
    })
  }
  console.log('✅ Notifications créées')

  // 15. Audit logs
  const auditActions = ['create', 'update', 'approve', 'login', 'export']
  const auditEntities = ['case', 'invoice', 'expense', 'document']
  for (let i = 0; i < 10; i++) {
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        profileId: allProfiles[i % allProfiles.length].id,
        action: auditActions[i % auditActions.length],
        entityType: auditEntities[i % auditEntities.length],
        entityId: cases[i % cases.length]?.id || null,
      },
    })
  }
  console.log('✅ Journaux d\'audit créés')

  // 16. Case status history
  for (const c of cases) {
    const historyCount = 1 + Math.floor(Math.random() * 3)
    const statusFlow = ['brouillon', 'demande_recue', 'devis_envoye', 'commande_confirme', 'dossier_ouvert', 'documents_en_attente', 'documents_conformes', 'en_transit', 'arrive_au_port', 'en_dedouanement', 'mainlevee_obtenue', 'sortie_autorise', 'en_livraison', 'livre', 'facturation_en_cours', 'cloture']
    const currentIdx = statusFlow.indexOf(c.status)
    const startIdx = Math.max(0, currentIdx - historyCount + 1)
    for (let i = startIdx; i <= currentIdx; i++) {
      await prisma.caseStatusHistory.create({
        data: {
          caseId: c.id,
          fromStatus: i > startIdx ? statusFlow[i - 1] : null,
          toStatus: statusFlow[i],
          profileId: p('chef_maritime').id,
        },
      })
    }
  }
  console.log('✅ Historiques de statut créés')

  // 17. Milestones
  const milestoneTypes = ['booking', 'embarquement', 'arrivee', 'dedouanement', 'sortie', 'livraison', 'retour_vide']
  const milestoneNames = ['Booking confirmé', 'Embarquement', 'Arrivée au port', 'Dédouanement', 'Sortie autorisée', 'Livraison', 'Retour conteneur vide']
  for (const c of cases) {
    const statusIdx = ['brouillon', 'demande_recue', 'devis_envoye', 'commande_confirme', 'dossier_ouvert', 'documents_en_attente', 'documents_conformes', 'en_transit', 'arrive_au_port', 'en_dedouanement', 'en_attente_paiement', 'mainlevee_obtenue', 'sortie_autorise', 'en_livraison', 'livre', 'facturation_en_cours', 'cloture'].indexOf(c.status)
    const milestoneCount = Math.min(Math.floor(statusIdx / 2) + 1, 7)
    for (let i = 0; i < milestoneCount; i++) {
      const isReached = i < milestoneCount - 1
      const isInProgress = i === milestoneCount - 1 && c.status !== 'cloture' && c.status !== 'livre'
      await prisma.caseMilestone.create({
        data: {
          caseId: c.id,
          name: milestoneNames[i],
          type: milestoneTypes[i],
          status: isReached ? 'atteint' : isInProgress ? 'en_cours' : 'planifie',
          plannedDate: c.eta ? new Date(c.eta.getTime() - (milestoneCount - 1 - i) * 3 * 24 * 60 * 60 * 1000) : null,
          actualDate: isReached ? new Date(Date.now() - (milestoneCount - 1 - i) * 2 * 24 * 60 * 60 * 1000) : null,
        },
      })
    }
  }
  console.log('✅ Jalons créés')

  // 18. Checklists
  const checklistItems = [
    { label: 'Bill of Lading (BL) reçu', cat: 'document', required: true },
    { label: 'Facture commerciale reçue', cat: 'document', required: true },
    { label: 'Packing List reçue', cat: 'document', required: true },
    { label: 'Certificat d\'origine reçu', cat: 'document', required: true },
    { label: 'Déclaration douanière préparée', cat: 'douane', required: true },
    { label: 'Droits de douane payés', cat: 'douane', required: true },
    { label: 'Mainlevée obtenue', cat: 'douane', required: false },
    { label: 'Transport assigné', cat: 'transport', required: false },
    { label: 'Preuve de livraison reçue', cat: 'transport', required: false },
    { label: 'Facture émise', cat: 'facturation', required: false },
  ]
  for (const c of cases) {
    for (const item of checklistItems) {
      const isCompleted = Math.random() > 0.4
      await prisma.caseChecklist.create({
        data: {
          caseId: c.id,
          label: item.label,
          category: item.cat,
          isRequired: item.required,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedById: isCompleted ? p('agent').id : null,
        },
      })
    }
  }
  console.log('✅ Checklists créés')

  // 19. Case assignees
  for (const c of cases) {
    await prisma.caseAssignee.create({
      data: { caseId: c.id, profileId: c.serviceChefId, role: 'chef_service' },
    })
    await prisma.caseAssignee.create({
      data: { caseId: c.id, profileId: p('agent').id, role: 'agent' },
    })
    if (c.type === 'maritime' || c.type === 'multimodal') {
      await prisma.caseAssignee.create({
        data: { caseId: c.id, profileId: p('declarant').id, role: 'declarant' },
      })
    }
  }
  console.log('✅ Assignations créées')

  // Summary
  console.log('\n═══════════════════════════════════════════')
  console.log('  IGS Nexus - Base de données peuplée')
  console.log('═══════════════════════════════════════════')
  console.log(`  Organisation : ${org.name}`)
  console.log(`  Profils      : ${allProfiles.length}`)
  console.log(`  Clients      : ${clients.length}`)
  console.log(`  Dossiers     : ${cases.length}`)
  console.log(`  Expéditions  : ${maritimeCases.length}`)
  console.log(`  Vols         : ${aerienCases.length}`)
  console.log(`  Missions     : ${terrestreCases.length}`)
  console.log(`  Factures     : ${invoiceData.length}`)
  console.log(`  Débours      : ${expenseData.length}`)
  console.log(`  Incidents    : ${incidentData.length}`)
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
