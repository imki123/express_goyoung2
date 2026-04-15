import express from 'express'
import type { Request, RequestHandler } from 'express'
import request from 'supertest'
import memosRouter from '../../src/router/memo/memos'
import { MemoMemoModel } from '../../src/model/memoMemo'

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

const createApp = (withAuth = true) => {
  const app = express()
  app.use(express.json())

  if (withAuth) {
    const authMiddleware: RequestHandler = (req, _res, next) => {
      (req as MemoRequest).memoUser = memoUser
      next()
    }

    app.use(authMiddleware)
  }

  app.use('/memos', memosRouter)
  return app
}

describe('memo router', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns 401 when memo auth context is missing', async () => {
    const app = createApp(false)

    const response = await request(app).get('/memos')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: '인증이 필요합니다.' })
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

    expect(response.status).toBe(200)
    expect(response.body).toEqual(savedMemo)
    expect(MemoMemoModel.findOne).toHaveBeenCalledWith(
      {},
      {},
      { sort: { memoId: -1 } }
    )
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
      memoId: '7',
      email: memoUser.email,
      sub: memoUser.sub,
    })
  })
})
