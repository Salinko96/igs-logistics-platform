import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mfaSetupUrl, safeMfaDestination } from '../../src/lib/security/mfa-navigation'

describe('navigation MFA', () => {
  it('conserve une destination interne', () => {
    assert.equal(safeMfaDestination('/facturation?statut=brouillon'), '/facturation?statut=brouillon')
    assert.equal(mfaSetupUrl('/facturation'), '/mfa-setup?next=%2Ffacturation')
  })

  it('refuse une destination externe ou absente', () => {
    assert.equal(safeMfaDestination('https://example.com'), '/dashboard')
    assert.equal(safeMfaDestination('//example.com'), '/dashboard')
    assert.equal(safeMfaDestination(null), '/dashboard')
  })
})
