import { Router } from 'express'
import memosRouter from './memos'
import userRouter from './user'

const memoRouter = Router()
const urls = {
  root: '/',
  user: '/user',
  memos: '/memos',
}
memoRouter.get(urls.root, (req, res) => {
  res.send(urls)
})
memoRouter.use(urls.user, userRouter)
memoRouter.use(urls.memos, memosRouter)

export default memoRouter
