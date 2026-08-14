import { expect, test } from '@playwright/test'
import speakeasy from 'speakeasy'
import { jsPDF } from 'jspdf'
import { apiLogin, hasAdminEnvironment, hasSecureEnvironment, secureEnvironment } from './helpers'

test.describe('parcours sécurisés sur base E2E dédiée', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })
  test('aucune fuite de dossiers entre organisations', async ({ playwright, baseURL }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer les comptes agents et dossiers de deux organisations E2E.')
    const env = secureEnvironment()
    const orgA = await playwright.request.newContext({ baseURL })
    const orgB = await playwright.request.newContext({ baseURL })
    await apiLogin(orgA, env.orgA)
    await apiLogin(orgB, env.orgB)

    expect((await orgA.get(`/api/cases/${env.orgBCaseId}`)).status()).toBe(404)
    expect((await orgB.get(`/api/cases/${env.orgACaseId}`)).status()).toBe(404)

    const listA = await (await orgA.get('/api/cases?pageSize=100')).json() as { items: Array<{ id: string }> }
    const listB = await (await orgB.get('/api/cases?pageSize=100')).json() as { items: Array<{ id: string }> }
    expect(listA.items.some((item) => item.id === env.orgBCaseId)).toBeFalsy()
    expect(listB.items.some((item) => item.id === env.orgACaseId)).toBeFalsy()

    const invoicesB = await (await orgB.get('/api/invoices?pageSize=100')).json() as { items: Array<{ id: string }> }
    if (invoicesB.items[0]) expect((await orgA.get(`/api/invoices/${invoicesB.items[0].id}`)).status()).toBe(404)
    const documentsB = await (await orgB.get('/api/documents?pageSize=100')).json() as { items: Array<{ id: string }> }
    if (documentsB.items[0]) expect((await orgA.get(`/api/documents/${documentsB.items[0].id}/signed-url`)).status()).toBe(404)
    await orgA.dispose(); await orgB.dispose()
  })

  test('un dossier externe est refusé pour upload, facture et document', async ({ playwright, baseURL }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer les comptes agents et dossiers de deux organisations E2E.')
    const env = secureEnvironment()
    const orgA = await playwright.request.newContext({ baseURL })
    await apiLogin(orgA, env.orgA)

    const upload = await orgA.post('/api/documents/upload', { multipart: {
      caseId: env.orgBCaseId,
      category: 'autre',
      file: { name: 'isolation.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e') },
    } })
    expect(upload.status()).toBe(404)

    const dangerousUpload = await orgA.post('/api/documents/upload', { multipart: {
      caseId: env.orgACaseId,
      file: { name: 'interdit.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') },
    } })
    expect(dangerousUpload.status()).toBe(400)

    const document = await orgA.post('/api/documents', { data: { name: 'Cross tenant', caseId: env.orgBCaseId } })
    expect(document.status()).toBe(404)

    const clients = await orgA.get('/api/clients')
    expect(clients.ok()).toBeTruthy()
    const ownClient = (await clients.json() as Array<{ id: string }>)[0]
    expect(ownClient).toBeTruthy()
    const invoice = await orgA.post('/api/invoices', { data: {
      clientId: ownClient.id,
      caseId: env.orgBCaseId,
      vatRegime: 'standard',
      items: [{ description: 'Test isolation', quantity: 1, unit: 'forfait', unitPrice: 1000, discountRate: 0, taxRate: 18 }],
    } })
    expect(invoice.status()).toBe(400)
    await orgA.dispose()
  })

  test('upload PDF et facturation fonctionnent dans la bonne organisation', async ({ playwright, baseURL }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer les comptes agents et dossiers de deux organisations E2E.')
    const env = secureEnvironment()
    const orgA = await playwright.request.newContext({ baseURL })
    await apiLogin(orgA, env.orgA)
    const upload = await orgA.post('/api/documents/upload', { multipart: {
      caseId: env.orgACaseId,
      category: 'autre',
      name: `E2E-${Date.now()}.pdf`,
      file: { name: 'preuve-e2e.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 IGS E2E') },
    } })
    expect(upload.status(), await upload.text()).toBe(201)

    const clients = await orgA.get('/api/clients')
    const ownClient = (await clients.json() as Array<{ id: string }>)[0]
    const invoice = await orgA.post('/api/invoices', { data: {
      clientId: ownClient.id,
      status: 'brouillon',
      currency: 'GNF',
      vatRegime: 'standard',
      vatWithholdingRate: 0,
      withholdingTaxRate: 0,
      items: [{ description: `Prestation E2E ${Date.now()}`, quantity: 1, unit: 'forfait', unitPrice: 1000, discountRate: 0, taxRate: 18 }],
    } })
    expect(invoice.status(), await invoice.text()).toBe(201)
    const created = await invoice.json() as { id: string; organizationId: string; invoiceNumber: string }
    const details = await orgA.get(`/api/invoices/${created.id}`)
    expect(details.status()).toBe(200)
    expect(created.invoiceNumber).toMatch(/^E2EA-\d{4}-\d{4}$/)
    const globalSearch = await orgA.get(`/api/search?q=${encodeURIComponent(created.invoiceNumber)}`)
    expect(globalSearch.status()).toBe(200)
    expect((await globalSearch.json() as { invoices: Array<{ id: string }> }).invoices.some((item) => item.id === created.id)).toBeTruthy()
    await orgA.dispose()
  })

  test('un PDF préremplit automatiquement les informations du document', async ({ page }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer un compte agent E2E dédié.')
    const env = secureEnvironment()
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.orgA.email)
    await page.getByLabel('Mot de passe').fill(env.orgA.password)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await page.waitForURL(/\/dashboard/)

    const casesResponse = await page.request.get('/api/cases?compact=true&pageSize=100')
    const casesPayload = await casesResponse.json() as { items: Array<{ id: string; reference: string }> }
    const targetCase = casesPayload.items.find((item) => item.id === env.orgACaseId) ?? casesPayload.items[0]
    expect(targetCase).toBeTruthy()

    const pdf = new jsPDF()
    pdf.text([
      'BILL OF LADING No MSCU987654321',
      'Container MSCU1234567',
      `Dossier ${targetCase.reference}`,
      'Date 14/08/2026',
    ], 20, 30)
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    await page.goto('/documents')
    await expect(page.getByRole('button', { name: 'Charger un document' })).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Charger un document' }).click()
    await page.locator('input[type="file"]').setInputFiles({
      name: 'scan-bl.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    })

    await expect(page.getByText(/Préremplissage terminé/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel('Nom du document')).toHaveValue(/MSCU987654321/)
    await expect(page.getByText(`Dossier détecté : ${targetCase.reference}`)).toBeVisible()
    await expect(page.getByLabel('Observations')).toHaveValue(/MSCU1234567/)
    await expect(page.getByRole('button', { name: /Vérifier et enregistrer/ })).toBeEnabled()
  })

  test('un administrateur doit vérifier puis atteint le niveau 2FA', async ({ page }) => {
    test.skip(!hasAdminEnvironment(), 'Configurer un compte administrateur E2E dédié.')
    const env = secureEnvironment()
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.admin.email)
    await page.getByLabel('Mot de passe').fill(env.admin.password)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await page.waitForURL(/\/mfa-verify/)
    await page.getByPlaceholder('000000').fill(speakeasy.totp({ secret: env.adminTotpSecret, encoding: 'base32' }))
    await page.getByRole('button', { name: 'Vérifier' }).click()
    await page.waitForURL(/\/dashboard/)
    const dashboard = await page.request.get('/api/dashboard')
    expect(dashboard.status()).toBe(200)
  })

  test('le menu mobile ne masque pas le tableau de bord au chargement', async ({ page }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer un compte agent E2E dédié.')
    const env = secureEnvironment()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.orgA.email)
    await page.getByLabel('Mot de passe').fill(env.orgA.password)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await page.waitForURL(/\/dashboard/)

    await expect(page.getByRole('button', { name: 'Langue' })).toHaveCount(0)
    await page.goto('/documents')
    const refuseCookies = page.getByRole('button', { name: 'Tout refuser' })
    if (await refuseCookies.isVisible()) await refuseCookies.click()
    await expect(page.getByLabel('Rechercher un document')).toBeVisible({ timeout: 45_000 })
    await page.goto('/rapports')
    await expect(page.getByText('Période du rapport')).toBeVisible()
    await expect(page.getByText('Date de début')).toBeVisible()
    await page.goto('/dashboard')

    const closeMenu = page.getByRole('button', { name: 'Fermer le menu' })
    await expect(closeMenu).toBeHidden()
    await expect(page.locator('header').getByText('Tableau de bord', { exact: true }).last()).toBeVisible()

    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(closeMenu).toBeVisible()
    await closeMenu.click()
    await expect(closeMenu).toBeHidden()
    await expect(page.locator('header').getByText('Tableau de bord', { exact: true }).last()).toBeVisible()
  })

  test('les filtres clients et les compteurs ouvrent les listes associées', async ({ page }) => {
    test.skip(!hasSecureEnvironment(), 'Configurer un compte agent E2E dédié.')
    const env = secureEnvironment()
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.orgA.email)
    await page.getByLabel('Mot de passe').fill(env.orgA.password)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await page.waitForURL(/\/dashboard/)
    await page.goto('/clients')
    const refuseCookies = page.getByRole('button', { name: 'Tout refuser' })
    if (await refuseCookies.isVisible()) await refuseCookies.click()

    await expect(page.getByLabel('Filtrer par secteur')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByLabel('Filtrer par ville')).toBeVisible()
    await expect(page.getByLabel('Filtrer par segment')).toBeVisible()
    const clientName = await page.locator('main h3').first().innerText()
    await page.getByRole('button', { name: /dossier/ }).first().click()
    await expect(page.locator('main input').first()).toHaveValue(clientName)

    await page.goto('/clients')
    await page.getByRole('button', { name: /facture/ }).first().click()
    await expect(page.locator('main input').first()).toHaveValue(clientName, { timeout: 60_000 })
  })
})
