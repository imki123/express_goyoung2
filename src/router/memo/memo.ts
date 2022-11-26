import { Router } from 'express'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import userRouter from './user'
import memosRouter from './memos'

const memoRouter = Router()
const urls = {
  root: '/',
  user: '/user',
  memo: '/memo',
}
memoRouter.get(urls.root, (req, res) => {
  res.send(urls)
})
memoRouter.use(urls.user, userRouter)
memoRouter.use(urls.memo, memosRouter)

export default memoRouter
