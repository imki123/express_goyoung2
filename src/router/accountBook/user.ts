import { Router } from 'express'
import { cookieOptions } from '../../cookie'
import jwt from 'jsonwebtoken'

const userRouter = Router()

const urls = {
  root: '/',
  logout: '/logout',
  checkEmail: '/checkEmail', // 로그인
  checkToken: '/checkToken', // 쿠키 체크
}

const checkEmail = (email: string) => {
  const allowedEmails = process.env.ALLOWED_EMAIL_FOR_ACCOUNT_BOOK?.split(',')
  console.info('## allowedEmails:', allowedEmails)
  console.info('## checkEmail:', email)

  return allowedEmails?.includes(email)
}

// 유저정보로 로그인
userRouter.post(urls.checkEmail, async (req, res) => {
  try {
    const user = req.body
    // 이메일 체크
    if (checkEmail(user.email)) {
      const token = jwt.sign(
        user,
        process.env.JWT_SECRET || '' //JWT 암호
      )
      res.cookie('account_book_access_token', token, cookieOptions())
      res.send({ token, user }) // jwt 토큰 FE에 보내기
    } else {
      res.send('email error')
    }
  } catch (e) {
    console.error(e)
    res.status(500).send(e)
  }
})

// 토큰 이메일 체크 (300일 이하면 미들웨어에서 토큰 재발급)
userRouter.post(urls.checkToken, async (req, res) => {
  try {
    if (req.body?.decodedUser) res.send(req.cookies.account_book_access_token)
    else {
      console.error('/checkToken: No Token!!')
      res.send(false)
    }
  } catch (e) {
    res.status(500).send(e)
  }
})

// 로그아웃 BE쿠키 제거
userRouter.post(urls.logout, async (req, res) => {
  try {
    if (req.body?.decodedUser) {
      console.info('Logout!', req.body?.decodedUser.email)
      res.cookie('account_book_access_token', '', cookieOptions())
      res.send(true)
    } else {
      console.info('Logout Fail!')
      res.status(403).send(false)
    }
  } catch (e) {
    console.info('Logout Fail!')
    res.status(500).send(e)
  }
})

// 유저 정보 가져오기
userRouter.get(urls.root, async (req, res) => {
  try {
    if (req.body?.decodedUser) {
      res.send(JSON.stringify(req.body?.decodedUser))
    } else res.status(403).send(false)
  } catch (e) {
    res.status(500).send(e)
  }
})

export default userRouter
