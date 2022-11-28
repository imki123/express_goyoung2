import { Router } from 'express'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import { MemoUserModel } from '../../model/memoUser'
import mongoose from 'mongoose'
import { cookieKeys, cookieOptions } from '../../cookie'
import { MemoMemoModel } from '../../model/memoMemo'

const memosRouter = Router()

const urls = {
  root: '/',
  memoId: '/:memoId',
}

// email, sub로 목록 전체 불러오기
memosRouter.get(urls.root, async (req, res) => {
  try {
    const { email, sub } = req.body.decodedUser || {}
    if (email && sub) {
      const memos = await MemoMemoModel.find({ email, sub }, null, {
        sort: { memoId: -1 }, // 내림차순
      })
      res.send(memos)
    } else {
      res.status(403).send('no session')
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.get(urls.memoId, async (req, res) => {
  try {
    const { email, sub } = req.body.decodedUser || {}
    const { memoId } = req.params
    if (email && sub && memoId) {
      const memo = await MemoMemoModel.findOne({ email, sub, memoId })
      res.send(memo)
    } else {
      res.status(403).send('no session')
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.post(urls.root, async (req, res) => {
  try {
    const { email, sub } = req.body.decodedUser || {}
    if (email && sub) {
      const lastMemo = await MemoMemoModel.findOne(
        {},
        {},
        { sort: { memoId: -1 } }
      )
      const lastMemoId = lastMemo?.memoId || 0
      const now = dayjs().format('YYYY-MM-DDTHH:mm:ss')
      const newMemo = new MemoMemoModel({
        memoId: lastMemoId + 1,
        email: email,
        sub: sub,
        text: '',
        createdAt: now,
        editedAt: now,
      })
      const result = await newMemo.save()
      res.send(result)
    } else {
      res.status(403).send('no session')
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.patch(urls.root, async (req, res) => {
  try {
    const { email, sub } = req.body.decodedUser || {}
    const { memo } = req.body
    console.log('>>> patchMemo:', memo)
    if (email && sub) {
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
        res.status(500).send('no memo')
      }
    } else {
      res.status(403).send('no session')
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

memosRouter.delete(urls.memoId, async (req, res) => {
  try {
    const { email, sub } = req.body.decodedUser || {}
    const { memoId } = req.params
    if (email && sub) {
      if (memoId) {
        const deletedMemoId = await MemoMemoModel.findOneAndDelete({
          memoId: memoId,
          email,
          sub,
        })
        res.send(deletedMemoId)
      } else {
        res.status(500).send('no memoId')
      }
    } else {
      res.status(403).send('no session')
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

export default memosRouter
