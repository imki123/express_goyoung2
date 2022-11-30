import { Router } from 'express'
import memosRouter from './memo'
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
