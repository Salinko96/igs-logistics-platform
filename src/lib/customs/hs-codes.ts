export interface HsCode {
  code: string
  description: string
  chapter: string
}

// Starter catalogue for the most common transit categories. It can be extended
// from the official tariff database without changing the picker API.
export const COMMON_HS_CODES: HsCode[] = [
  { code: '0303', description: 'Poissons congelés', chapter: '03 - Produits de la pêche' },
  { code: '0402', description: 'Lait et crème concentrés', chapter: '04 - Produits laitiers' },
  { code: '1006', description: 'Riz', chapter: '10 - Céréales' },
  { code: '1511', description: 'Huile de palme', chapter: '15 - Graisses et huiles' },
  { code: '1701', description: 'Sucre de canne ou de betterave', chapter: '17 - Sucres' },
  { code: '2523', description: 'Ciments hydrauliques', chapter: '25 - Produits minéraux' },
  { code: '3923', description: 'Emballages et articles de transport en plastique', chapter: '39 - Matières plastiques' },
  { code: '8471', description: 'Machines automatiques de traitement de l’information', chapter: '84 - Machines et appareils' },
  { code: '8703', description: 'Voitures de tourisme', chapter: '87 - Véhicules' },
  { code: '8711', description: 'Motocycles et cycles', chapter: '87 - Véhicules' },
]

export function isValidHsCode(value: string) {
  return /^(?:\d{4}|\d{6}|\d{8}|\d{10})$/.test(value.trim())
}

export function searchHsCodes(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return COMMON_HS_CODES
  return COMMON_HS_CODES.filter((item) =>
    item.code.startsWith(normalized) || item.description.toLowerCase().includes(normalized) || item.chapter.toLowerCase().includes(normalized),
  )
}
