import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { configurationStatus } from '../../src/lib/configuration'

const core = {
  DATABASE_URL: 'postgresql://user:pass@example.com:6543/postgres',
  DIRECT_URL: 'postgresql://user:pass@example.com:5432/postgres',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
}

describe('configurationStatus', () => {
  it('refuse un socle incomplet ou une URL Supabase invalide', () => {
    assert.equal(configurationStatus({}).coreReady, false)
    assert.equal(configurationStatus({ ...core, NEXT_PUBLIC_SUPABASE_URL: 'javascript:alert(1)' }).coreReady, false)
  })

  it('valide le socle sans rendre les fournisseurs facultatifs obligatoires', () => {
    const status = configurationStatus(core)
    assert.equal(status.coreReady, true)
    assert.equal(status.integrations.stripe, false)
    assert.equal(status.integrations.sentry, false)
  })

  it('accepte le nom ShipsGo officiel et le nom historique', () => {
    assert.equal(configurationStatus({ ...core, SHIPSGO_AUTH_CODE: 'auth' }).integrations.shipsGo, true)
    assert.equal(configurationStatus({ ...core, SHIPSGO_API_KEY: 'legacy' }).integrations.shipsGo, true)
  })

  it('exige les deux paramètres pour les intégrations composées', () => {
    assert.equal(configurationStatus({ ...core, RESEND_API_KEY: 'key' }).integrations.transactionalEmail, false)
    assert.equal(configurationStatus({ ...core, RESEND_API_KEY: 'key', EMAIL_FROM: 'noreply@example.com' }).integrations.transactionalEmail, true)
    assert.equal(configurationStatus({ ...core, STRIPE_SECRET_KEY: 'key' }).integrations.stripe, false)
  })
})
