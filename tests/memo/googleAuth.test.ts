const mockVerifyIdToken = jest.fn()

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}))

import { verifyGoogleCredential } from '../../src/router/memo/googleAuth'

describe('verifyGoogleCredential', () => {
  afterEach(() => {
    mockVerifyIdToken.mockReset()
  })

  it('rejects a Google credential with an unverified email', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'user@example.com',
        sub: 'google-subject',
        email_verified: false,
      }),
    })

    const credential = await verifyGoogleCredential('id-token', 'client-id')

    expect(credential).toBeNull()
  })
})
