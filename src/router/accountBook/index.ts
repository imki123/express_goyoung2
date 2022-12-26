import { Router } from 'express'
import sheetRouter from './sheet'
import typeRouter from './type'
import userRouter from './user'

const accountBookRouter = Router()
const urls = {
  root: '/',
  user: '/user',
  sheet: '/sheet',
  type: '/type',
}
accountBookRouter.get(urls.root, (req, res) => {
  res.send(urls)
})
accountBookRouter.use(urls.user, userRouter)
accountBookRouter.use(urls.sheet, sheetRouter)
accountBookRouter.use(urls.type, typeRouter)

export default accountBookRouter
