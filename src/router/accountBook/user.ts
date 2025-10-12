import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { cookieOptions } from '../../cookie'
import { ACCOUNT_BOOK_ACCESS_TOKEN } from './constants'
import { AccountBookUserDocument } from '../../model/accountBookUser'

const userRouter = Router()

const urls = {
  root: '/',
  login: '/login',
  checkSession: '/checkSession',
  logout: '/logout',
}

const isAuthorizedEmail = (email: string) => {
  const allowedEmails = process.env.ALLOWED_EMAIL_FOR_ACCOUNT_BOOK?.split(',')
  console.info('## allowedEmails:', allowedEmails)
  console.info('## isAuthorizedEmail:', email)

  return allowedEmails?.includes(email)
}

// 유저정보로 로그인
userRouter.post(urls.login, async (req, res) => {
  try {
    const userData = req.body as Partial<AccountBookUserDocument>
    // 이메일 체크
    if (isAuthorizedEmail(userData.email || '')) {
      const userPayload = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      }
      const session = jwt.sign(userPayload, process.env.JWT_SECRET || '', {
        issuer: 'express_goyoung2',
        audience: 'account_book_app',
        expiresIn: '60d',
      })
      res.send({ session, user: userPayload }) // jwt 토큰 FE에 보내기
    } else {
      res.send('email error')
    }
  } catch (e) {
    console.error(e)
    res.status(500).send(e)
  }
})

// 토큰 이메일 체크 (300일 이하면 미들웨어에서 토큰 재발급)
userRouter.post(urls.checkSession, async (req, res) => {
  try {
    const decodedUser = req.body?.decodedUser as
      | AccountBookUserDocument
      | undefined
    if (decodedUser) {
      res.send({ user: decodedUser, token: req.body.session })
    } else {
      console.error('/checkToken: No Token!!')
      res.send(false)
    }
  } catch (e) {
    res.status(500).send(e)
  }
})

const sessionBlacklist: string[] = []

// 로그아웃 세션만료
userRouter.post(urls.logout, async (req, res) => {
  try {
    if (req.body?.session && !sessionBlacklist.includes(req.body.session)) {
      sessionBlacklist.push(req.body.session)
      // 쿠키 삭제. deprecated
      res.clearCookie(ACCOUNT_BOOK_ACCESS_TOKEN, cookieOptions())
      res.send(true)
    } else {
      res.send(false)
    }
  } catch (e) {
    console.info('Logout Fail!')
    res.status(500).send(e)
  }
})

// 유저 정보 가져오기
userRouter.get(urls.root, async (req, res) => {
  try {
    const decodedUser = req.body?.decodedUser as
      | AccountBookUserDocument
      | undefined
    if (decodedUser) {
      res.send(decodedUser)
    } else {
      res.status(403).send({ error: '인증이 필요합니다.' })
    }
  } catch (e) {
    res.status(500).send(e)
  }
})

export default userRouter
