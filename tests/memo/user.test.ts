import express from 'express'
import request from 'supertest'
import memoRouter from '../../src/router/memo'
import { MemoUserModel } from '../../src/model/memoUser'
import { verifyGoogleCredential } from '../../src/router/memo/googleAuth'

jest.mock('../../src/router/memo/googleAuth', () => ({
  verifyGoogleCredential: jest.fn(),
}))

const mockVerifyGoogleCredential =
  verifyGoogleCredential as jest.MockedFunction<typeof verifyGoogleCredential>

const createApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/memo', memoRouter)
  return app
}

describe('memo user login', () => {
  beforeEach(() => {
    process.env.GOOGLE_SECRET = 'test-secret'
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mockVerifyGoogleCredential.mockReset()
  })

  it('verifies Google credential and returns a server token', async () => {
    const googlePayload = {
      email: 'memo@example.com',
      sub: 'google-sub-1',
      name: 'Memo User',
      picture: 'https://example.com/avatar.png',
    }

    mockVerifyGoogleCredential.mockResolvedValueOnce(googlePayload)

    const existingUser = {
      email: googlePayload.email,
      sub: googlePayload.sub,
      name: googlePayload.name,
      picture: googlePayload.picture,
      hashedLockPassword: undefined,
      toObject: () => ({
        email: googlePayload.email,
        sub: googlePayload.sub,
        name: googlePayload.name,
        picture: googlePayload.picture,
        hashedLockPassword: undefined,
      }),
    }

    jest
      .spyOn(MemoUserModel, 'findOne')
      .mockResolvedValueOnce(existingUser as never)

    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined)

    const app = createApp()
    const response = await request(app)
      .post('/memo/user/login')
      .send({ credential: 'google-id-token' })

    expect(response.status).toBe(200)
    expect(response.body.email).toBe(googlePayload.email)
    expect(response.body.token).toEqual(expect.any(String))
    expect(mockVerifyGoogleCredential).toHaveBeenCalledWith(
      'google-id-token',
      'test-client-id'
    )
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[loginAttempt]')
    )
    expect(infoSpy).toHaveBeenCalledWith(
      `[userVerified] ${googlePayload.email}`
    )
  })

  it('rejects invalid Google credential payloads', async () => {
    mockVerifyGoogleCredential.mockResolvedValueOnce(null)

    const app = createApp()
    const response = await request(app)
      .post('/memo/user/login')
      .send({ credential: 'invalid-google-id-token' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '유효한 구글 토큰이 아닙니다.' })
  })
})
