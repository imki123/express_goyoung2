import { MemoMemoModel } from '../../model/memoMemo'
import { MemoUserDocument } from '../../model/memoUser'
import { Router } from 'express'
import dayjs from 'dayjs'

const memosRouter = Router()

const urls = {
  root: '/',
  memoId: '/:memoId',
  allIds: '/allIds',
}

// 모든 메모 id 불러오기
memosRouter.get(urls.allIds, async (req, res) => {
  try {
    const allIds = await MemoMemoModel.find({}, 'memoId', {
      sort: { memoId: 1 }, // 오름차순
    })
    res.send(allIds)
  } catch (err) {
    res.status(500).send(err)
  }
})

// email, sub로 목록 전체 불러오기
memosRouter.get(urls.root, async (req, res) => {
  try {
    const authenticatedUser = req.body.decodedUser as
      | MemoUserDocument
      | undefined
    if (!authenticatedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
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

memosRouter.get(urls.memoId, async (req, res) => {
  try {
    const authenticatedUser = req.body.decodedUser as
      | MemoUserDocument
      | undefined
    if (!authenticatedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }
    const { email, sub } = authenticatedUser
    const { memoId } = req.params
    if (memoId) {
      const foundMemo = await MemoMemoModel.findOne({ email, sub, memoId })
      if (foundMemo) res.send(foundMemo)
      else res.status(400).send(false)
    } else {
      res.status(400).send({ error: 'memoId가 필요합니다.' })
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

// 메모 추가
memosRouter.post(urls.root, async (req, res) => {
  try {
    const authenticatedUser = req.body.decodedUser as
      | MemoUserDocument
      | undefined
    if (!authenticatedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }
    const { email, sub } = authenticatedUser
    const lastMemo = await MemoMemoModel.findOne(
      {},
      {},
      { sort: { memoId: -1 } }
    )
    const lastMemoId = lastMemo?.memoId || 0
    // 한국시간 GMT+9
    const currentTime = dayjs()
      .add(process.env.NODE_ENV === 'production' ? 9 : 0, 'hour')
      .format('YYYY-MM-DDTHH:mm:ss')
    const newMemo = new MemoMemoModel({
      memoId: lastMemoId + 1,
      email: email,
      sub: sub,
      text: '',
      createdAt: currentTime,
      editedAt: currentTime,
    })
    const savedMemo = await newMemo.save()
    res.send(savedMemo)
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.patch(urls.root, async (req, res) => {
  try {
    const authenticatedUser = req.body.decodedUser as
      | MemoUserDocument
      | undefined
    if (!authenticatedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }
    const { email, sub } = authenticatedUser
    const { memo } = req.body
    // console.log('>>> patchMemo:', memo)
    if (memo) {
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
      res.send(updatedMemo)
    } else {
      res.status(400).send({ error: '메모 데이터가 필요합니다.' })
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.delete(urls.memoId, async (req, res) => {
  try {
    const authenticatedUser = req.body.decodedUser as
      | MemoUserDocument
      | undefined
    if (!authenticatedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }
    const { email, sub } = authenticatedUser
    const { memoId } = req.params
    if (memoId) {
      const deletedMemo = await MemoMemoModel.findOneAndDelete({
        memoId: memoId,
        email,
        sub,
      })
      res.send(deletedMemo)
    } else {
      res.status(400).send({ error: 'memoId가 필요합니다.' })
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

export default memosRouter
