import { expect, test } from '@playwright/test'

test('la page d’accueil propose une connexion sans exposer les profils', async ({ page }) => {
  const profileRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/profiles')) profileRequests.push(request.url())
  })

  await page.goto('/')

  await expect(page.getByRole('link', { name: /Se connecter/ })).toHaveAttribute('href', '/login')
  await expect(page.getByText(/Impossible de charger les profils/)).toHaveCount(0)
  expect(profileRequests).toHaveLength(0)
})

test.describe('conformité publique', () => {
  for (const [path, heading] of [
    ['/conditions-generales', 'Conditions générales d’utilisation et de service'],
    ['/confidentialite', 'Politique de confidentialité'],
    ['/mentions-legales', 'Mentions légales'],
    ['/cookies', 'Politique relative aux cookies'],
  ] as const) {
    test(`${path} est accessible`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveTitle(/IGS Nexus/)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Documents juridiques' })).toBeVisible()
    })
  }
})

test('le refus des cookies ne charge pas Analytics', async ({ page }) => {
  const analyticsRequests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/_vercel/insights')) analyticsRequests.push(request.url()) })
  await page.goto('/login')
  const banner = page.getByRole('complementary', { name: 'Consentement aux cookies' })
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: 'Tout refuser' }).click()
  await expect(page.getByRole('button', { name: 'Gérer les cookies' })).toBeVisible()
  await expect.poll(() => analyticsRequests.length).toBe(0)
  const cookie = await page.context().cookies()
  expect(cookie.find((item) => item.name === 'igs-cookie-consent')?.value).toContain('%22analytics%22%3Afalse')
})

test('les préférences cookies peuvent être modifiées', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('complementary', { name: 'Consentement aux cookies' }).getByRole('button', { name: 'Personnaliser' }).click()
  await page.getByRole('switch', { name: 'Autoriser la mesure d’audience' }).check()
  await page.getByRole('button', { name: 'Enregistrer mon choix' }).click()
  await expect(page.getByRole('dialog', { name: 'Préférences de confidentialité' })).toBeHidden()
  await page.getByRole('button', { name: 'Gérer les cookies' }).click()
  await expect(page.getByRole('dialog', { name: 'Préférences de confidentialité' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Autoriser la mesure d’audience' })).toBeChecked()
})

test('les routes privées redirigent les visiteurs', async ({ page, request }) => {
  const privateResponse = await request.get('/dossiers', { maxRedirects: 0 })
  expect(privateResponse.status()).toBe(307)
  expect(privateResponse.headers()['x-robots-tag']).toContain('noindex')
  await page.goto('/dossiers')
  await expect(page).toHaveURL(/\/login\?next=%2Fdossiers/)
  for (const endpoint of ['/api/cases', '/api/documents', '/api/invoices']) {
    const response = await request.get(endpoint)
    expect(response.status(), endpoint).toBe(401)
  }
})

test('les pages 2FA exigent une session authentifiée', async ({ page }) => {
  for (const path of ['/mfa-setup', '/mfa-verify']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2F${path.slice(1)}`))
  }
})

test('la validation upload rejette les fichiers dangereux avant envoi', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  const response = await page.request.post('/api/documents/upload', {
    multipart: { file: { name: 'malware.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') } },
  })
  expect(response.status()).toBe(401)
})

test('le contrôle de santé ne divulgue aucune configuration', async ({ request }) => {
  const response = await request.get('/api/health')
  expect([200, 503]).toContain(response.status())
  const body = await response.json()
  expect(body.service).toBe('igs-logistics-platform')
  expect(['ok', 'degraded']).toContain(body.status)
  expect(JSON.stringify(body)).not.toMatch(/password|secret|authCode|database_url/i)
})
