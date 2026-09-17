import express from 'express'
import type { Request, RequestHandler } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import memosRouter from '../../src/router/memo/memos'
import { MemoMemoModel } from '../../src/model/memoMemo'
import { MemoUserModel } from '../../src/model/memoUser'
import { sessionCheck } from '../../src/middleware/memoMiddleware'

jest.mock('dayjs', () => () => ({
  add: () => ({
    format: () => '2026-04-16T12:00:00',
  }),
}))

type MemoUserContext = {
  email: string
  sub: string
  name: string
  picture: string
  locked: boolean
}

type MemoRecord = {
  memoId: number
  email: string
  sub: string
  text: string
  createdAt: string
  editedAt: string
}

interface MemoRequest extends Request {
  memoUser?: MemoUserContext
}

const memoUser: MemoUserContext = {
  email: 'memo@example.com',
  sub: 'memo-sub-1',
  name: 'Memo User',
  picture: 'https://example.com/avatar.png',
  locked: false,
}

const canonicalMemoUser: MemoUserContext = {
  email: 'canonical@example.com',
  sub: 'canonical-sub',
  name: 'Canonical User',
  picture: 'https://example.com/canonical.png',
  locked: false,
}

const authorizedSubAccount: MemoUserContext = {
  email: 'sub-account@example.com',
  sub: 'sub-account-sub',
  name: 'Sub Account',
  picture: 'https://example.com/sub-account.png',
  locked: false,
}

const unrelatedMemoUser: MemoUserContext = {
  email: 'unrelated@example.com',
  sub: 'unrelated-sub',
  name: 'Unrelated User',
  picture: 'https://example.com/unrelated.png',
  locked: false,
}

const createApp = (withAuth = true, authenticatedUser = memoUser) => {
  const app = express()
  app.use(express.json())

  if (withAuth) {
    const authMiddleware: RequestHandler = (req, _res, next) => {
      const memoReq = req as MemoRequest
      memoReq.memoUser = authenticatedUser
      next()
    }

    app.use(authMiddleware)
  }

  app.use('/memos', memosRouter)
  return app
}

const createSessionApp = () => {
  const app = express()
  app.use(express.json())
  app.use(async (req, _res, next) => {
    await sessionCheck(req)
    next()
  })
  app.use('/memos', memosRouter)
  return app
}

describe('memo router', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.MEMO_CANONICAL_OWNER_EMAIL
    delete process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL
  })

  it('returns 401 when memo auth context is missing', async () => {
    const app = createApp(false)

    const response = await request(app).get('/memos')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '인증이 필요합니다.' })
  })

  it('returns 401 when memo ids are requested without auth context', async () => {
    const app = createApp(false)

    const response = await request(app).get('/memos/allIds')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '인증이 필요합니다.' })
  })

  it('returns the current user memo ids only', async () => {
    const expectedIds = [{ memoId: 1 }, { memoId: 3 }]

    jest
      .spyOn(MemoMemoModel, 'find')
      .mockResolvedValueOnce(expectedIds as never)

    const app = createApp()
    const response = await request(app).get('/memos/allIds')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expectedIds)
    expect(MemoMemoModel.find).toHaveBeenCalledWith(
      { email: memoUser.email, sub: memoUser.sub },
      'memoId',
      { sort: { memoId: 1 } }
    )
  })

  it('returns the current user memos', async () => {
    const expectedMemos: MemoRecord[] = [
      {
        memoId: 2,
        email: memoUser.email,
        sub: memoUser.sub,
        text: 'second memo',
        createdAt: '2026-04-16T12:00:00',
        editedAt: '2026-04-16T12:00:00',
      },
    ]

    jest.spyOn(MemoMemoModel, 'find').mockResolvedValueOnce(expectedMemos)

    const app = createApp()
    const response = await request(app).get('/memos')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expectedMemos)
    expect(MemoMemoModel.find).toHaveBeenCalledWith(
      { email: memoUser.email, sub: memoUser.sub },
      null,
      { sort: { memoId: -1 } }
    )
  })

  it('creates a new memo with a sequential memoId', async () => {
    const savedMemo: MemoRecord = {
      memoId: 3,
      email: memoUser.email,
      sub: memoUser.sub,
      text: '',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T12:00:00',
    }

    jest.spyOn(MemoMemoModel, 'findOne').mockResolvedValueOnce({ memoId: 2 })
    jest.spyOn(MemoMemoModel.prototype, 'save').mockResolvedValueOnce(savedMemo)

    const app = createApp()
    const response = await request(app).post('/memos')

    expect(response.status).toBe(201)
    expect(response.body).toEqual(savedMemo)
    expect(MemoMemoModel.findOne).toHaveBeenCalledWith(
      { email: memoUser.email, sub: memoUser.sub },
      { memoId: 1 },
      { sort: { memoId: -1 } }
    )
  })

  it('retries memo creation when the next memoId collides', async () => {
    const savedMemo: MemoRecord = {
      memoId: 4,
      email: memoUser.email,
      sub: memoUser.sub,
      text: '',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T12:00:00',
    }
    const duplicateMemoIdError = { code: 11000 }

    jest
      .spyOn(MemoMemoModel, 'findOne')
      .mockResolvedValueOnce({ memoId: 2 })
      .mockResolvedValueOnce({ memoId: 3 })
    jest
      .spyOn(MemoMemoModel.prototype, 'save')
      .mockRejectedValueOnce(duplicateMemoIdError)
      .mockResolvedValueOnce(savedMemo)

    const app = createApp()
    const response = await request(app).post('/memos')

    expect(response.status).toBe(201)
    expect(response.body).toEqual(savedMemo)
    expect(MemoMemoModel.findOne).toHaveBeenCalledTimes(2)
    expect(MemoMemoModel.prototype.save).toHaveBeenCalledTimes(2)
  })

  it('returns 404 when the memo is missing', async () => {
    jest.spyOn(MemoMemoModel, 'findOne').mockResolvedValueOnce(null)

    const app = createApp()
    const response = await request(app).get('/memos/7')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: '메모를 찾을 수 없습니다.' })
    expect(MemoMemoModel.findOne).toHaveBeenCalledWith({
      email: memoUser.email,
      sub: memoUser.sub,
      memoId: 7,
    })
  })

  it('returns 400 when memoId path params are invalid', async () => {
    const findOneSpy = jest.spyOn(MemoMemoModel, 'findOne')
    const app = createApp()
    const response = await request(app).get('/memos/not-a-number')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'memoId가 올바르지 않습니다.' })
    expect(findOneSpy).not.toHaveBeenCalled()
  })

  it('updates the memo body for the current user', async () => {
    const updatedMemo: MemoRecord = {
      memoId: 7,
      email: memoUser.email,
      sub: memoUser.sub,
      text: 'updated text',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T13:00:00',
    }

    jest
      .spyOn(MemoMemoModel, 'findOneAndUpdate')
      .mockResolvedValueOnce(updatedMemo)

    const app = createApp()
    const response = await request(app)
      .patch('/memos')
      .send({
        memo: {
          memoId: 7,
          text: 'updated text',
          editedAt: '2026-04-16T13:00:00',
        },
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(updatedMemo)
    expect(MemoMemoModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        memoId: 7,
        email: memoUser.email,
        sub: memoUser.sub,
      },
      {
        text: 'updated text',
        editedAt: '2026-04-16T13:00:00',
      },
      {
        new: true,
      }
    )
  })

  it('returns 400 when update memo data is missing', async () => {
    const updateSpy = jest.spyOn(MemoMemoModel, 'findOneAndUpdate')
    const app = createApp()
    const response = await request(app).patch('/memos').send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: '메모 데이터가 필요합니다.' })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when update memoId is invalid', async () => {
    const updateSpy = jest.spyOn(MemoMemoModel, 'findOneAndUpdate')
    const app = createApp()
    const response = await request(app)
      .patch('/memos')
      .send({
        memo: {
          memoId: '7',
          text: 'updated text',
          editedAt: '2026-04-16T13:00:00',
        },
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'memoId가 올바르지 않습니다.' })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('returns 404 when the memo to update is missing', async () => {
    jest.spyOn(MemoMemoModel, 'findOneAndUpdate').mockResolvedValueOnce(null)

    const app = createApp()
    const response = await request(app)
      .patch('/memos')
      .send({
        memo: {
          memoId: 7,
          text: 'updated text',
          editedAt: '2026-04-16T13:00:00',
        },
      })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: '메모를 찾을 수 없습니다.' })
  })

  it('deletes the memo for the current user', async () => {
    const deletedMemo: MemoRecord = {
      memoId: 7,
      email: memoUser.email,
      sub: memoUser.sub,
      text: 'deleted text',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T12:00:00',
    }

    jest
      .spyOn(MemoMemoModel, 'findOneAndDelete')
      .mockResolvedValueOnce(deletedMemo)

    const app = createApp()
    const response = await request(app).delete('/memos/7')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(deletedMemo)
    expect(MemoMemoModel.findOneAndDelete).toHaveBeenCalledWith({
      memoId: 7,
      email: memoUser.email,
      sub: memoUser.sub,
    })
  })

  it('returns 400 when delete memoId is invalid', async () => {
    const deleteSpy = jest.spyOn(MemoMemoModel, 'findOneAndDelete')
    const app = createApp()
    const response = await request(app).delete('/memos/0')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'memoId가 올바르지 않습니다.' })
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('returns 404 when the memo to delete is missing', async () => {
    jest.spyOn(MemoMemoModel, 'findOneAndDelete').mockResolvedValueOnce(null)

    const app = createApp()
    const response = await request(app).delete('/memos/7')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: '메모를 찾을 수 없습니다.' })
  })

  it('uses the canonical owner records for authorized sub-account CRUD', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalMemoUser.email
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = authorizedSubAccount.email

    jest
      .spyOn(MemoUserModel, 'findOne')
      .mockResolvedValue(canonicalMemoUser as never)
    jest.spyOn(MemoMemoModel, 'find').mockResolvedValueOnce([])
    jest.spyOn(MemoMemoModel, 'findOne').mockResolvedValueOnce({ memoId: 4 })
    jest.spyOn(MemoMemoModel.prototype, 'save').mockResolvedValueOnce({
      memoId: 5,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
      text: '',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T12:00:00',
    } as never)
    jest.spyOn(MemoMemoModel, 'findOneAndUpdate').mockResolvedValueOnce({
      memoId: 3,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
      text: 'shared update',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T13:00:00',
    } as never)
    jest.spyOn(MemoMemoModel, 'findOneAndDelete').mockResolvedValueOnce({
      memoId: 3,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
      text: 'shared update',
      createdAt: '2026-04-16T12:00:00',
      editedAt: '2026-04-16T13:00:00',
    } as never)

    const app = createApp(true, authorizedSubAccount)

    await request(app).get('/memos')
    await request(app).post('/memos')
    await request(app).patch('/memos').send({
      memo: {
        memoId: 3,
        text: 'shared update',
        editedAt: '2026-04-16T13:00:00',
      },
    })
    await request(app).delete('/memos/3')

    expect(MemoMemoModel.find).toHaveBeenCalledWith(
      { email: canonicalMemoUser.email, sub: canonicalMemoUser.sub },
      null,
      { sort: { memoId: -1 } }
    )
    expect(MemoMemoModel.findOne).toHaveBeenCalledWith(
      { email: canonicalMemoUser.email, sub: canonicalMemoUser.sub },
      { memoId: 1 },
      { sort: { memoId: -1 } }
    )
    expect(MemoMemoModel.findOneAndUpdate).toHaveBeenCalledWith(
      { memoId: 3, email: canonicalMemoUser.email, sub: canonicalMemoUser.sub },
      { text: 'shared update', editedAt: '2026-04-16T13:00:00' },
      { new: true }
    )
    expect(MemoMemoModel.findOneAndDelete).toHaveBeenCalledWith({
      memoId: 3,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
    })
  })

  it('keeps unrelated users isolated when sharing is enabled', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalMemoUser.email
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = authorizedSubAccount.email
    jest.spyOn(MemoMemoModel, 'find').mockResolvedValueOnce([])
    const findOneSpy = jest.spyOn(MemoUserModel, 'findOne')

    const app = createApp(true, unrelatedMemoUser)
    const response = await request(app).get('/memos')

    expect(response.status).toBe(200)
    expect(MemoMemoModel.find).toHaveBeenCalledWith(
      { email: unrelatedMemoUser.email, sub: unrelatedMemoUser.sub },
      null,
      { sort: { memoId: -1 } }
    )
    expect(findOneSpy).not.toHaveBeenCalled()
  })

  it('uses canonical records for shared memo ID lists and individual memos', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalMemoUser.email
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = authorizedSubAccount.email
    jest
      .spyOn(MemoUserModel, 'findOne')
      .mockResolvedValue(canonicalMemoUser as never)
    jest
      .spyOn(MemoMemoModel, 'find')
      .mockResolvedValueOnce([{ memoId: 3 }] as never)
    jest.spyOn(MemoMemoModel, 'findOne').mockResolvedValueOnce({
      memoId: 3,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
    } as never)

    const app = createApp(true, authorizedSubAccount)
    const allIdsResponse = await request(app).get('/memos/allIds')
    const memoResponse = await request(app).get('/memos/3')

    expect(allIdsResponse.status).toBe(200)
    expect(memoResponse.status).toBe(200)
    expect(MemoMemoModel.find).toHaveBeenCalledWith(
      { email: canonicalMemoUser.email, sub: canonicalMemoUser.sub },
      'memoId',
      { sort: { memoId: 1 } }
    )
    expect(MemoMemoModel.findOne).toHaveBeenCalledWith({
      memoId: 3,
      email: canonicalMemoUser.email,
      sub: canonicalMemoUser.sub,
    })
  })

  it('returns 403 after a valid JWT when shared ownership configuration is invalid', async () => {
    process.env.GOOGLE_SECRET = 'test-secret'
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalMemoUser.email
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(memoUser as never)
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const token = jwt.sign(
      {
        email: memoUser.email,
        sub: memoUser.sub,
        name: memoUser.name,
        picture: memoUser.picture,
      },
      process.env.GOOGLE_SECRET,
      { issuer: 'express_goyoung2', audience: 'memo_app' }
    )

    const response = await request(createSessionApp())
      .get('/memos')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: '메모 소유자 설정이 올바르지 않습니다.',
    })
  })
})
