import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import * as auth from '../../lib/auth'

describe('Mock Test', () => {
  it('should test mocking getSessionProfile', async () => {
    mock.method(auth, 'getSessionProfile', async () => {
      return {
        user: { id: 'user-1' } as any,
        profile: {
          id: 'prof-1',
          userId: 'user-1',
          role: 'ADMIN',
          organizationId: 'org-1',
          clientId: null,
        } as any,
      }
    })

    const session = await auth.getSessionProfile()
    assert.equal(session.profile?.role, 'ADMIN')
  })
})
