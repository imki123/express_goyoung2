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
      const memoReq = req as MemoRequest
      memoReq.memoUser = memoUser
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
})
