import { Router } from 'express'
import dayjs from 'dayjs'
import { cookieExpire } from '../../util/util'
import jwt from 'jsonwebtoken'
import userRouter from './user/user'

const memoRouter = Router()
const urls = {
  root: '/',
  user: '/user',
}
memoRouter.get(urls.root, (req, res) => {
  res.send(urls)
})
memoRouter.use(urls.user, userRouter)

export default memoRouter
