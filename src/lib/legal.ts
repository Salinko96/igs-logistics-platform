export const LEGAL_VERSION = '2026-08-12'

export const legalIdentity = {
  platformName: 'IGS Nexus',
  publisherName: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER_NAME || 'IGS Global Forwarding',
  legalForm: process.env.NEXT_PUBLIC_LEGAL_FORM || 'À compléter par l’éditeur',
  capital: process.env.NEXT_PUBLIC_LEGAL_CAPITAL || 'À compléter par l’éditeur',
  rccm: process.env.NEXT_PUBLIC_LEGAL_RCCM || 'À compléter par l’éditeur',
  taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || 'NIF-2024-001234',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || 'Corniche Nord, Kaloum, Conakry, République de Guinée',
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE || '+224 622 11 22 33',
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || 'contact@igsglobalforwarding.com',
  director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR || 'À compléter par l’éditeur',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'contact@igsglobalforwarding.com',
} as const

export const legalLinks = [
  { href: '/conditions-generales', label: 'Conditions générales' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cookies', label: 'Cookies' },
] as const
