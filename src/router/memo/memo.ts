import { Router } from 'express'
import dayjs from 'dayjs'
import { cookieExpire } from '../../util/util'

const memoRouter = Router()
const expire = dayjs().add(10, 'minute').toDate()

const urls = {
  root: '/',
  login: '/login',
}

memoRouter.get(urls.root, (req, res) => {
  res.send(urls)
})

memoRouter.post(urls.login, (req, res) => {
  console.log(expire)
  console.log('>>> req:', req.body)
  res.cookie('go-cookie', process.env.PORT || '4001', {
    expires: cookieExpire(), // 365일
  })
  res.send({ name: 'hoodie' })
})

export default memoRouter
