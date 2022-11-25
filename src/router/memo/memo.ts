import { Router } from 'express'
import dayjs from 'dayjs'
import { cookieExpire } from '../../util/util'

const memoRouter = Router()
const expire = dayjs().add(10, 'minute').toDate()

memoRouter.get('/login', (req, res) => {
  console.log(expire)
  res.cookie('go-cookie', '1234', {
    expires: cookieExpire(), // 365일
  })
  res.send({ name: 'hoodie' })
})

export default memoRouter
