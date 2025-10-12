import { cookieKeys, cookieOptions, jwtCookieOptions } from '../../cookie'

import { MemoUserModel, MemoUserDocument } from '../../model/memoUser'
import { Router, Request } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userRouter = Router()

interface AuthenticatedRequest extends Request {
  body: Request['body'] & {
    decodedUser?: MemoUserDocument
  }
}

const urls = {
  root: '/',
  login: '/login',
  logout: '/logout',
  checkLogin: '/checkLogin',
  setLock: '/setLock',
  removeLock: '/removeLock',
  unlock: '/unlock',
}

userRouter.get(urls.root, (req, res) => {
  res.send(urls)
})

userRouter.post(urls.login, async (req, res) => {
  const token = req.body.credential
  const secret = process.env.GOOGLE_SECRET

  // 환경변수 검증
  if (!secret) {
    console.error('GOOGLE_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).send('서버 설정 오류')
  }

  console.info(`[loginAttempt] ${req.ip}, ${req.url}, ${token}`)
  try {
    if (token) {
      // google login jwt decoded(암호화 안되어있음)
      const decoded = jwt.decode(token) as jwt.JwtPayload
      // decoded로 signed 만들고 쿠키로 등록
      const user = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        sub: decoded.sub,
      }
      console.info(`[userDecoded] ${user.name}, ${user.email}`)

      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '60d'
      const signed = jwt.sign(user, secret, {
        expiresIn: jwtExpiresIn,
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      })

      const cookieOpts = jwtCookieOptions(jwtExpiresIn)
      console.info('# setCookie cookieOptions:', cookieOpts)
      res.cookie(cookieKeys.go_memo_session, signed, cookieOpts)
      console.info('# res.cookie:', res.cookie)

      const search = await MemoUserModel.findOne({
        email: user.email,
        sub: user.sub,
      })
      if (search) {
        if (search.picture !== user.picture) {
          const updated = await MemoUserModel.findOneAndUpdate(
            { email: user.email, sub: user.sub },
            { picture: user.picture },
            { new: true }
          )
          res.send(updated)
        } else {
          res.send(search)
        }
      } else {
        const newUser = new MemoUserModel(user)
        const savedUser = await newUser.save()
        console.info('>>> newUser:', savedUser)
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

userRouter.post(urls.logout, async (req, res) => {
  res.clearCookie(cookieKeys.go_memo_session, cookieOptions())
  res.send(true)
})

userRouter.post(urls.checkLogin, async (req, res) => {
  if (req.body?.decodedUser) {
    res.send(req.body.decodedUser)
  } else {
    res.send(false)
  }
})

userRouter.post(urls.setLock, async (req: AuthenticatedRequest, res) => {
  try {
    const { password } = req.body
    const decodedUser = req.body.decodedUser

    if (!decodedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }

    const user = await MemoUserModel.findOne({
      email: decodedUser.email,
      sub: decodedUser.sub,
    })

    if (user) {
      const saltRounds = 12
      const hashedLockPassword = await bcrypt.hash(password, saltRounds)
      user.hashedLockPassword = hashedLockPassword
      await user.save()
      res.send({ success: true, message: '비밀번호가 설정되었습니다.' })
    } else {
      res.status(404).send({ error: '사용자를 찾을 수 없습니다.' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '서버 오류가 발생했습니다.' })
  }
})

userRouter.post(urls.unlock, async (req: AuthenticatedRequest, res) => {
  try {
    const { password } = req.body
    const decodedUser = req.body.decodedUser

    if (!decodedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }

    const user = await MemoUserModel.findOne({
      email: decodedUser.email,
      sub: decodedUser.sub,
    })

    if (user && user.hashedLockPassword) {
      const isValidPassword = await bcrypt.compare(
        password,
        user.hashedLockPassword
      )
      if (isValidPassword) {
        res.send({ success: true, message: '잠금이 해제되었습니다.' })
      } else {
        res.status(401).send({ error: '비밀번호가 일치하지 않습니다.' })
      }
    } else {
      res.status(404).send({
        error: '사용자를 찾을 수 없거나 비밀번호가 설정되지 않았습니다.',
      })
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '비밀번호 검증 중 오류가 발생했습니다.' })
  }
})

userRouter.post(urls.removeLock, async (req: AuthenticatedRequest, res) => {
  try {
    const decodedUser = req.body.decodedUser

    if (!decodedUser) {
      return res.status(401).send({ error: '인증이 필요합니다.' })
    }

    const user = await MemoUserModel.findOne({
      email: decodedUser.email,
      sub: decodedUser.sub,
    })

    if (user) {
      user.hashedLockPassword = undefined
      await user.save()
      res.send({ success: true, message: '잠금 비밀번호가 제거되었습니다.' })
    } else {
      console.info(`[removeLock fail] ${decodedUser.email}, ${decodedUser.sub}`)
      res.status(404).send({ error: '사용자를 찾을 수 없습니다.' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '서버 오류가 발생했습니다.' })
  }
})

export default userRouter
