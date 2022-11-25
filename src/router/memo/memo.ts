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

memoRouter.get(urls.login, (req, res) => {
  console.log(expire)
  res.cookie('go-cookie', '1234', {
    expires: cookieExpire(), // 365일
  })
  res.send({ name: 'hoodie' })
})

export default memoRouter
