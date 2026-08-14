import assert from 'node:assert/strict'
import test from 'node:test'
import { can, canAccessPath, getHomePath } from '../../src/lib/rbac/permissions'

test('chaque rôle rejoint son espace métier', () => {
  assert.equal(getHomePath('ADMIN'), '/dashboard')
  assert.equal(getHomePath('COMMERCIAL'), '/commercial')
  assert.equal(getHomePath('EXPLOITANT'), '/exploitant')
  assert.equal(getHomePath('COMPTABLE'), '/comptable')
})

test('la matrice distingue lecture, modification et validation', () => {
  assert.equal(can('COMMERCIAL', 'create', 'devis'), true)
  assert.equal(can('COMMERCIAL', 'update', 'douane_sydonia'), false)
  assert.equal(can('EXPLOITANT', 'update', 'douane_sydonia'), true)
  assert.equal(can('EXPLOITANT', 'create', 'facturation'), false)
  assert.equal(can('COMPTABLE', 'validate', 'debours'), true)
  assert.equal(can('COMPTABLE', 'update', 'transport'), false)
})

test('les routes sensibles redirigent hors du rôle', () => {
  assert.equal(canAccessPath('EXPLOITANT', '/parametres'), false)
  assert.equal(canAccessPath('COMMERCIAL', '/abonnement'), false)
  assert.equal(canAccessPath('COMPTABLE', '/tracking'), false)
  assert.equal(canAccessPath('EXPLOITANT', '/exploitant/douane'), true)
})
