import { Router } from 'express'

import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import { cookieExpire } from '../../../util/util'
import { MemoUserModel } from '../../../model/user'
import mongoose from 'mongoose'

const userRouter = Router()

const urls = {
  root: '/',
  login: '/login',
  logout: '/logout',
  checkLogin: '/checkLogin',
}

userRouter.get(urls.root, (req, res) => {
  res.send(urls)
})

userRouter.post(urls.login, async (req, res) => {
  const token = req.body.credential
  const secret = process.env.GOOGLE_SECRET || ''
  try {
    if (token) {
      // google login jwt decoded(암호화 안되어있음)
      const decoded = jwt.decode(token) as jwt.JwtPayload
      // console.log('>>> decoded', decoded)
      // decoded로 signed 만들고 쿠키로 등록
      const user = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        sub: decoded.sub,
      }
      const signed = jwt.sign(user, secret)
      res.cookie('go_memo_session', signed, {
        expires: cookieExpire(), // 365일
      })

      // 이메일, sub(id)로 유저 조회하고, 없으면 새로 save()
      const search = await MemoUserModel.findOne({
        email: user.email,
        sub: user.sub,
      })
      if (search) {
        // picture 바꼈으면 업데이트
        if (search.picture !== user.picture) {
          await MemoUserModel.findOneAndUpdate(
            { email: user.email, sub: user.sub },
            {
              picture: user.picture,
            }
          )
        }
        res.send(search)
      } else {
        const User = new MemoUserModel(user)
        const newUser = await User.save() // 새로운 유저 저장
        console.log('>>> newUser:', newUser)
        // user 정보 FE로 전송
        res.send(user)
      }
    } else {
      res.status(500).send('No credential')
    }
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

// 로그인여부 체크. memoMiddleware에서 req.body에 decodedUser 추가해줌
userRouter.post(urls.checkLogin, async (req, res) => {
  if (req.body?.decodedUser) {
    res.send(req.body?.decodedUser)
  } else {
    res.send(false)
  }
})

export default userRouter
