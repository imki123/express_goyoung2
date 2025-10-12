import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { cookieOptions } from '../../cookie'
import { ACCOUNT_BOOK_ACCESS_TOKEN } from './constants'
import { AccountBookUserDocument } from '../../model/accountBookUser'

const userRouter = Router()

const urls = {
  root: '/',
  login: '/login',
  checkToken: '/checkToken',
  logout: '/logout',
}

const isAuthorizedEmail = (email: string) => {
  const allowedEmails = process.env.ALLOWED_EMAIL_FOR_ACCOUNT_BOOK?.split(',')
  console.info('## allowedEmails:', allowedEmails)
  console.info('## isAuthorizedEmail:', email)

  return allowedEmails?.includes(email)
}

userRouter.post(urls.login, async (req, res) => {
  try {
    const userData = req.body as Partial<AccountBookUserDocument>
    if (isAuthorizedEmail(userData.email || '')) {
      const userPayload = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      }
      const token = jwt.sign(userPayload, process.env.GOOGLE_SECRET || '', {
        issuer: 'express_goyoung2',
        audience: 'account_book_app',
        expiresIn: '60d',
      })
      res.send({ token, ...userPayload })
    } else {
      res.send('email error')
    }
  } catch (e) {
    console.error(e)
    res.status(500).send(e)
  }
})

userRouter.post(urls.checkToken, async (req, res) => {
  try {
    const decodedUser = req.body?.decodedUser as
      | AccountBookUserDocument
      | undefined
    const token = req.body?.token

    if (decodedUser) {
      if (typeof token === 'string') {
        res.send({ ...decodedUser, token })
      } else {
        console.error('/checkToken: Token is not a string:', token)
        res.status(500).send({ error: 'Invalid token format' })
      }
    } else {
      console.error('/checkToken: No decodedUser!!')
      res.send(false)
    }
  } catch (e) {
    console.error('/checkToken error:', e)
    res.status(500).send(e)
  }
})

const tokenBlacklist: string[] = []

userRouter.post(urls.logout, async (req, res) => {
  try {
    if (req.body?.token && !tokenBlacklist.includes(req.body.token)) {
      tokenBlacklist.push(req.body.token)
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
