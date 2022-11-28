import dayjs from 'dayjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'

import memosRouter from './memos'
import userRouter from './user'


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
