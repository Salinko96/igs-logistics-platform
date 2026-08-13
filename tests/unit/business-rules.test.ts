import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { latestDate, rollingTwelveMonthRange } from '../../src/lib/reporting'
import { calculateInvoice } from '../../src/lib/invoicing'
import { missingLegalOrganizationFields } from '../../src/lib/organization'
import { paginationMeta, parsePagination } from '../../src/lib/pagination'
import { validatePassword } from '../../src/lib/security/password'
import { getRequestId } from '../../src/lib/integrations/shipsgo-client'

describe('règles métier critiques', () => {
  it('ancre les douze mois glissants sur la dernière activité disponible', () => {
    const anchor = latestDate([new Date('2026-08-13T00:00:00Z'), new Date('2027-07-15T00:00:00Z')])
    const range = rollingTwelveMonthRange(anchor)
    assert.equal(range.from.toISOString().slice(0, 10), '2026-08-01')
    assert.equal(range.to.toISOString().slice(0, 10), '2027-07-15')
  })
  it('applique TVA, remise et retenues sans erreur d’arrondi', () => {
    const invoice = calculateInvoice([
      { description: 'Transit maritime', quantity: 2, unitPrice: 500_000, discountRate: 10, taxRate: 18 },
    ], { vatRegime: 'standard', vatWithholdingRate: 50, withholdingTaxRate: 10 })

    assert.equal(invoice.totalAmount, 900_000)
    assert.equal(invoice.taxAmount, 162_000)
    assert.equal(invoice.netAmount, 1_062_000)
    assert.equal(invoice.vatWithholdingAmount, 81_000)
    assert.equal(invoice.withholdingTaxAmount, 90_000)
    assert.equal(invoice.amountPayable, 891_000)
  })

  it('neutralise la TVA pour une prestation exonérée', () => {
    const invoice = calculateInvoice([
      { description: 'Export', quantity: 1, unitPrice: 100_000, taxRate: 18 },
    ], { vatRegime: 'exonere' })
    assert.equal(invoice.taxAmount, 0)
    assert.equal(invoice.amountPayable, 100_000)
  })

  it('impose la politique de mot de passe complète', () => {
    assert.equal(validatePassword('Court1!'), false)
    assert.equal(validatePassword('sansmajuscule1!'), false)
    assert.equal(validatePassword('Solide-2026!'), true)
  })

  it('borne la pagination serveur', () => {
    assert.deepEqual(parsePagination(new URLSearchParams('page=-2&pageSize=1000')), { page: 1, pageSize: 100, skip: 0 })
    assert.deepEqual(paginationMeta(41, 2, 20), { page: 2, pageSize: 20, total: 41, pageCount: 3, hasPreviousPage: true, hasNextPage: true })
  })

  it('détecte les mentions légales manquantes pour la facturation', () => {
    const missing = missingLegalOrganizationFields({ name: 'IGS', address: '', city: 'Conakry', country: 'Guinée', phone: null, email: 'contact@example.com', taxId: 'NIF-1' })
    assert.deepEqual(missing, ['Adresse', 'Téléphone'])
  })

  it('normalise les variantes de requestId ShipsGo', () => {
    assert.equal(getRequestId({ requestId: 123 }), '123')
    assert.equal(getRequestId({ RequestId: '456' }), '456')
    assert.equal(getRequestId({}), null)
  })
})
