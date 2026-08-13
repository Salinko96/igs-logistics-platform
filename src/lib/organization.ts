export const LEGAL_ORGANIZATION_FIELDS = [
  ['name', 'Raison sociale'],
  ['address', 'Adresse'],
  ['city', 'Ville'],
  ['country', 'Pays'],
  ['phone', 'Téléphone'],
  ['email', 'Email'],
  ['taxId', 'NIF'],
] as const

type LegalOrganization = Record<(typeof LEGAL_ORGANIZATION_FIELDS)[number][0], string | null | undefined>

export function missingLegalOrganizationFields(organization: LegalOrganization) {
  return LEGAL_ORGANIZATION_FIELDS
    .filter(([key]) => !organization[key]?.trim())
    .map(([, label]) => label)
}

export function isLegalOrganizationComplete(organization: LegalOrganization) {
  return missingLegalOrganizationFields(organization).length === 0
}
