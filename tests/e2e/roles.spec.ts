import { expect, test } from '@playwright/test'

const accounts = {
  commercial: { email: 'fatou.camara@igs.gn', password: process.env.E2E_COMMERCIAL_PASSWORD },
  exploitant: { email: 'mamadou.conde@igs.gn', password: process.env.E2E_EXPLOITANT_PASSWORD },
  comptable: { email: 'aissatou.diallo@igs.gn', password: process.env.E2E_COMPTABLE_PASSWORD },
}

for (const [role, account] of Object.entries(accounts)) {
  test(`${role}: home métier et cockpit admin interdit`, async ({ page }) => {
    test.skip(!account.password, `E2E_${role.toUpperCase()}_PASSWORD non défini`)
    await page.goto('/login'); await page.getByLabel(/email/i).fill(account.email); await page.getByLabel(/mot de passe/i).fill(account.password!); await page.getByRole('button', { name: /se connecter/i }).click()
    await expect(page).toHaveURL(new RegExp(`/travail/${role}`), { timeout: 15_000 })
    const sharedCases = await page.request.get('/api/cases?search=IGS-2027-MUL-0001')
    expect(sharedCases.ok()).toBeTruthy()
    const sharedPayload = await sharedCases.json()
    expect(sharedPayload.items.filter((item: { reference: string }) => item.reference === 'IGS-2027-MUL-0001')).toHaveLength(1)
    const forbidden = role === 'commercial'
      ? await page.request.post('/api/customs', { data: {} })
      : role === 'exploitant'
        ? await page.request.post('/api/payments', { data: {} })
        : await page.request.post('/api/cases', { data: {} })
    expect(forbidden.status()).toBe(403)
    await page.goto('/dashboard'); await expect(page).toHaveURL(new RegExp(`/travail/${role}`), { timeout: 15_000 })
    await page.goto('/parametres'); await expect(page).toHaveURL(new RegExp(`/travail/${role}`), { timeout: 15_000 })
  })
}

test('inscription employé ne permet jamais de choisir admin', async ({ page }) => {
  await page.goto('/inscription')
  await expect(page.getByText('Poste demandé')).toBeVisible()
  await expect(page.getByRole('option', { name: /administrateur/i })).toHaveCount(0)
})
