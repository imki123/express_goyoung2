import { Router } from 'express'

import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import { cookieExpire } from '../../../util/util'

const userRouter = Router()

const urls = {
  root: '/',
  login: '/login',
  register: '/register',
}

userRouter.get(urls.root, (req, res) => {
  res.send(urls)
})

userRouter.post(urls.login, (req, res) => {
  const token = req.body.jwt
  const secret = process.env.GOOGLE_SECRET || ''
  let decoded
  try {
    // google login jwt decoded(암호화 안되어있음)
    decoded = jwt.decode(token) as jwt.JwtPayload

    // decoded로 signed 만들고 쿠키로 등록
    const signed = jwt.sign(decoded, secret)
    res.cookie('go_memo_session', signed, {
      expires: cookieExpire(), // 365일
    })

    // user 정보 FE로 전송 // TODO: DB에 저장해서 다시 가져와야함
    const user = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    }
    res.send(user)
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

export default userRouter
