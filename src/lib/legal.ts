export const LEGAL_VERSION = '2026-08-12'

export const legalIdentity = {
  platformName: 'IGS Nexus',
  publisherName: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME || 'IGS Global Forwarding',
  legalForm: process.env.NEXT_PUBLIC_LEGAL_FORM || 'Non renseignée',
  capital: process.env.NEXT_PUBLIC_LEGAL_CAPITAL || 'Non renseigné',
  rccm: process.env.NEXT_PUBLIC_LEGAL_RCCM || 'Non renseigné',
  taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || 'Non renseigné',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || 'Non renseignée',
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE || 'Non renseigné',
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || 'Non renseigné',
  director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || 'Non renseigné',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'Non renseigné',
} as const

export const legalLinks = [
  { href: '/conditions-generales', label: 'Conditions générales' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cookies', label: 'Cookies' },
] as const
