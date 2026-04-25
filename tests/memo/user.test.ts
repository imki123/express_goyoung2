import express from 'express'
import type { Request, RequestHandler } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import memoRouter from '../../src/router/memo'
import { MemoUserModel } from '../../src/model/memoUser'
import { verifyGoogleCredential } from '../../src/router/memo/googleAuth'

jest.mock('../../src/router/memo/googleAuth', () => ({
  verifyGoogleCredential: jest.fn(),
}))

const mockVerifyGoogleCredential =
  verifyGoogleCredential as jest.MockedFunction<typeof verifyGoogleCredential>

type MemoUserContext = {
  email: string
  sub: string
  name: string
  picture: string
  locked: boolean
}

interface MemoRequest extends Request {
  memoUser?: MemoUserContext
}

const memoUser: MemoUserContext = {
  email: 'memo@example.com',
  sub: 'google-sub-1',
  name: 'Memo User',
  picture: 'https://example.com/avatar.png',
  locked: false,
}

const createUserDoc = (
  overrides: Partial<MemoUserContext> & {
    hashedLockPassword?: string
  } = {}
) => ({
  email: memoUser.email,
  sub: memoUser.sub,
  name: memoUser.name,
  picture: memoUser.picture,
  hashedLockPassword: undefined as string | undefined,
  ...overrides,
})

const createApp = (withAuth = false) => {
  const app = express()
  app.use(express.json())

  if (withAuth) {
    const authMiddleware: RequestHandler = (req, _res, next) => {
      const memoReq = req as MemoRequest
      memoReq.memoUser = memoUser
      next()
    }

    app.use(authMiddleware)
  }

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
      email: memoUser.email,
      sub: memoUser.sub,
      name: memoUser.name,
      picture: memoUser.picture,
    }

    mockVerifyGoogleCredential.mockResolvedValueOnce(googlePayload)

    const existingUser = createUserDoc()

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
    expect(response.body.locked).toBe(false)
    expect(response.body).not.toHaveProperty('hashedLockPassword')
    expect(response.body).not.toHaveProperty('accessToken')
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

  it('does not expose lock password hashes on login', async () => {
    mockVerifyGoogleCredential.mockResolvedValueOnce({
      email: memoUser.email,
      sub: memoUser.sub,
      name: memoUser.name,
      picture: memoUser.picture,
    })

    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(
      createUserDoc({
        hashedLockPassword: '$2b$12$hashed-lock-password',
      }) as never
    )
    jest.spyOn(console, 'info').mockImplementation(() => undefined)

    const app = createApp()
    const response = await request(app)
      .post('/memo/user/login')
      .send({ credential: 'google-id-token' })

    expect(response.status).toBe(200)
    expect(response.body.locked).toBe(true)
    expect(response.body).not.toHaveProperty('hashedLockPassword')
  })

  it('does not expose lock password hashes on checkLogin', async () => {
    const token = jwt.sign(
      {
        email: memoUser.email,
        sub: memoUser.sub,
        name: memoUser.name,
        picture: memoUser.picture,
      },
      process.env.GOOGLE_SECRET || '',
      {
        expiresIn: '60d',
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      }
    )

    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(
      createUserDoc({
        hashedLockPassword: '$2b$12$hashed-lock-password',
      }) as never
    )

    const app = createApp()
    const response = await request(app)
      .post('/memo/user/checkLogin')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.locked).toBe(true)
    expect(response.body.token).toBe(token)
    expect(response.body).not.toHaveProperty('hashedLockPassword')
    expect(response.body).not.toHaveProperty('accessToken')
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

  it('sets a lock password for the authenticated user', async () => {
    const user = {
      ...createUserDoc(),
      save: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(user as never)
    jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashed-password' as never)

    const app = createApp(true)
    const response = await request(app)
      .post('/memo/user/setLock')
      .send({ password: '1234' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      message: '비밀번호가 설정되었습니다.',
    })
    expect(bcrypt.hash).toHaveBeenCalledWith('1234', 12)
    expect(user.hashedLockPassword).toBe('hashed-password')
    expect(user.save).toHaveBeenCalled()
  })

  it('unlocks when the lock password matches', async () => {
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(
      createUserDoc({
        hashedLockPassword: 'hashed-password',
      }) as never
    )
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never)

    const app = createApp(true)
    const response = await request(app)
      .post('/memo/user/unlock')
      .send({ password: '1234' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      message: '잠금이 해제되었습니다.',
    })
    expect(bcrypt.compare).toHaveBeenCalledWith('1234', 'hashed-password')
  })

  it('rejects unlock when the lock password does not match', async () => {
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(
      createUserDoc({
        hashedLockPassword: 'hashed-password',
      }) as never
    )
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never)

    const app = createApp(true)
    const response = await request(app)
      .post('/memo/user/unlock')
      .send({ password: 'wrong' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '비밀번호가 일치하지 않습니다.' })
  })

  it('removes a lock password when the password matches', async () => {
    const user = {
      ...createUserDoc({
        hashedLockPassword: 'hashed-password',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(user as never)
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never)

    const app = createApp(true)
    const response = await request(app)
      .post('/memo/user/removeLock')
      .send({ password: '1234' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      message: '잠금 비밀번호가 제거되었습니다.',
    })
    expect(user.hashedLockPassword).toBeUndefined()
    expect(user.save).toHaveBeenCalled()
  })

  it('returns 401 when lock routes are missing auth context', async () => {
    const app = createApp()
    const response = await request(app)
      .post('/memo/user/setLock')
      .send({ password: '1234' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '인증이 필요합니다.' })
  })
})
