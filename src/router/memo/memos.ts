import { MemoMemoModel } from '../../model/memoMemo'
import { Request, Response, Router } from 'express'
import dayjs from 'dayjs'

const memosRouter = Router()

type MemoUserContext = NonNullable<Request['memoUser']>

type MemoItemParams = {
  memoId: string
}

type MemoPatchBody = {
  memo?: {
    memoId: number
    text: string
    editedAt: string
  }
}

const sendAuthError = (res: Response) =>
  res.status(401).send({ error: '인증이 필요합니다.' })

const sendBadRequest = (res: Response, message: string) =>
  res.status(400).send({ error: message })

const sendNotFound = (res: Response, message: string) =>
  res.status(404).send({ error: message })

const isDuplicateMemoIdError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return false
  return 'code' in error && (error as { code?: number }).code === 11000
}

const parseMemoId = (memoId: string) => {
  const parsedMemoId = Number(memoId)
  if (!Number.isInteger(parsedMemoId) || parsedMemoId < 1) {
    return null
  }

  return parsedMemoId
}

const getCurrentTime = () =>
  dayjs()
    .add(process.env.NODE_ENV === 'production' ? 9 : 0, 'hour')
    .format('YYYY-MM-DDTHH:mm:ss')

const getNextMemoId = async (email: string, sub: string) => {
  const lastMemo = await MemoMemoModel.findOne(
    { email, sub },
    { memoId: 1 },
    { sort: { memoId: -1 } }
  )

  return (lastMemo?.memoId || 0) + 1
}

const createMemoForUser = async (authenticatedUser: MemoUserContext) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentTime = getCurrentTime()
    const memoId = await getNextMemoId(
      authenticatedUser.email,
      authenticatedUser.sub
    )
    const newMemo = new MemoMemoModel({
      memoId,
      email: authenticatedUser.email,
      sub: authenticatedUser.sub,
      text: '',
      createdAt: currentTime,
      editedAt: currentTime,
    })

    try {
      return await newMemo.save()
    } catch (error) {
      if (!isDuplicateMemoIdError(error) || attempt === 1) {
        throw error
      }
    }
  }

  throw new Error('메모 생성에 실패했습니다.')
}

const urls = {
  root: '/',
  memoId: '/:memoId',
  allIds: '/allIds',
}

memosRouter.get(urls.allIds, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.memoUser
    if (!authenticatedUser) {
      return sendAuthError(res)
    }

    const { email, sub } = authenticatedUser
    const allIds = await MemoMemoModel.find({ email, sub }, 'memoId', {
      sort: { memoId: 1 }, // 오름차순
    })
    return res.send(allIds)
  } catch (err) {
    return res.status(500).send(err)
  }
})

// email, sub로 목록 전체 불러오기
memosRouter.get(urls.root, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.memoUser
    if (!authenticatedUser) {
      return sendAuthError(res)
    }
    const { email, sub } = authenticatedUser
    const userMemos = await MemoMemoModel.find({ email, sub }, null, {
      sort: { memoId: -1 }, // 내림차순
    })
    res.send(userMemos)
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.get(
  urls.memoId,
  async (req: Request<MemoItemParams>, res: Response) => {
    try {
      const authenticatedUser = req.memoUser
      if (!authenticatedUser) {
        return sendAuthError(res)
      }
      const { email, sub } = authenticatedUser
      const memoId = parseMemoId(req.params.memoId)

      if (memoId === null) {
        return sendBadRequest(res, 'memoId가 올바르지 않습니다.')
      }

      const foundMemo = await MemoMemoModel.findOne({ email, sub, memoId })
      if (!foundMemo) {
        return sendNotFound(res, '메모를 찾을 수 없습니다.')
      }

      return res.send(foundMemo)
    } catch (err) {
      return res.status(500).send(err)
    }
  }
)

// 메모 추가
memosRouter.post(urls.root, async (req: Request, res: Response) => {
  try {
    const authenticatedUser = req.memoUser
    if (!authenticatedUser) {
      return sendAuthError(res)
    }
    const savedMemo = await createMemoForUser(authenticatedUser)
    return res.status(201).send(savedMemo)
  } catch (err) {
    return res.status(500).send(err)
  }
})

// 메모 수정
memosRouter.patch(
  urls.root,
  async (req: Request<unknown, unknown, MemoPatchBody>, res: Response) => {
    try {
      const authenticatedUser = req.memoUser
      if (!authenticatedUser) {
        return sendAuthError(res)
      }
      const { email, sub } = authenticatedUser
      const { memo } = req.body

      if (!memo) {
        return sendBadRequest(res, '메모 데이터가 필요합니다.')
      }

      if (!Number.isInteger(memo.memoId) || memo.memoId < 1) {
        return sendBadRequest(res, 'memoId가 올바르지 않습니다.')
      }

      const updatedMemo = await MemoMemoModel.findOneAndUpdate(
        {
          memoId: memo.memoId,
          email,
          sub,
        },
        {
          text: memo.text,
          editedAt: memo.editedAt,
        },
        {
          new: true,
        }
      )

      if (!updatedMemo) {
        return sendNotFound(res, '메모를 찾을 수 없습니다.')
      }

      return res.send(updatedMemo)
    } catch (err) {
      return res.status(500).send(err)
    }
  }
)

memosRouter.delete(
  urls.memoId,
  async (req: Request<MemoItemParams>, res: Response) => {
    try {
      const authenticatedUser = req.memoUser
      if (!authenticatedUser) {
        return sendAuthError(res)
      }
      const { email, sub } = authenticatedUser
      const memoId = parseMemoId(req.params.memoId)

      if (memoId === null) {
        return sendBadRequest(res, 'memoId가 올바르지 않습니다.')
      }

      const deletedMemo = await MemoMemoModel.findOneAndDelete({
        memoId,
        email,
        sub,
      })

      if (!deletedMemo) {
        return sendNotFound(res, '메모를 찾을 수 없습니다.')
      }

      return res.send(deletedMemo)
    } catch (err) {
      return res.status(500).send(err)
    }
  }
)

export default memosRouter
