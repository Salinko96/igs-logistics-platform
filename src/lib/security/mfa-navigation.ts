export function safeMfaDestination(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export function mfaSetupUrl(destination: string | null | undefined) {
  return `/mfa-setup?next=${encodeURIComponent(safeMfaDestination(destination))}`
}
