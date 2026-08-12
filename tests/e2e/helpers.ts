import { expect, type APIRequestContext, type Page } from '@playwright/test'

export type E2ECredentials = { email: string; password: string }

export async function login(page: Page, credentials: E2ECredentials) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Mot de passe').fill(credentials.password)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

export async function apiLogin(request: APIRequestContext, credentials: E2ECredentials) {
  const response = await request.post('/api/auth/login', { data: credentials })
  expect(response.ok(), await response.text()).toBeTruthy()
  return response.json() as Promise<{ destination: string; mfaSetupRequired: boolean; mfaVerificationRequired: boolean }>
}

export function secureEnvironment() {
  return {
    orgA: { email: process.env.E2E_ORG_A_EMAIL || '', password: process.env.E2E_ORG_A_PASSWORD || '' },
    orgB: { email: process.env.E2E_ORG_B_EMAIL || '', password: process.env.E2E_ORG_B_PASSWORD || '' },
    admin: { email: process.env.E2E_ADMIN_EMAIL || '', password: process.env.E2E_ADMIN_PASSWORD || '' },
    adminTotpSecret: process.env.E2E_ADMIN_TOTP_SECRET || '',
    orgACaseId: process.env.E2E_ORG_A_CASE_ID || '',
    orgBCaseId: process.env.E2E_ORG_B_CASE_ID || '',
  }
}

export function hasSecureEnvironment() {
  const env = secureEnvironment()
  return Boolean(env.orgA.email && env.orgA.password && env.orgB.email && env.orgB.password && env.orgACaseId && env.orgBCaseId)
}

export function hasAdminEnvironment() {
  const { admin } = secureEnvironment()
  return Boolean(admin.email && admin.password && secureEnvironment().adminTotpSecret)
}
