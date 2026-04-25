import { MemoUserModel, MemoJwtPayload } from '../../model/memoUser'
import { Router, Request } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { verifyGoogleCredential } from './googleAuth'

const userRouter = Router()

type PasswordBody = {
  password: string
}

type MemoUserResponse = MemoJwtPayload & {
  locked: boolean
  token: string
}

const sanitizeMemoUserWithToken = (
  user: {
    email: string
    sub: string
    name?: string
    picture?: string
    hashedLockPassword?: string // hashed password 제거
  },
  accessToken: string
): MemoUserResponse => ({
  email: user.email,
  sub: user.sub,
  name: user.name,
  picture: user.picture,
  locked: !!user.hashedLockPassword,
  token: accessToken,
})

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
  const googleClientId = process.env.GOOGLE_CLIENT_ID

  if (!secret) {
    console.error('GOOGLE_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).send('서버 설정 오류')
  }

  if (!googleClientId) {
    console.error('GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.')
    return res.status(500).send('서버 설정 오류')
  }

  console.info(`[loginAttempt] ${req.ip}, ${req.url}`)
  try {
    if (token) {
      const decoded = await verifyGoogleCredential(token, googleClientId)

      if (!decoded?.email || !decoded.sub) {
        return res.status(401).send({ error: '유효한 구글 토큰이 아닙니다.' })
      }

      const user: MemoJwtPayload = {
        name: decoded.name || '',
        email: decoded.email,
        picture: decoded.picture || '',
        sub: decoded.sub,
      }
      console.info(`[userVerified] ${user.email}`)

      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '60d'
      const signedToken = jwt.sign(user, secret, {
        expiresIn: jwtExpiresIn,
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      })

      const existingUser = await MemoUserModel.findOne({
        email: user.email,
        sub: user.sub,
      })
      if (existingUser) {
        if (existingUser.picture !== user.picture) {
          const updatedUser = await MemoUserModel.findOneAndUpdate(
            { email: user.email, sub: user.sub },
            { picture: user.picture },
            { new: true }
          )
          if (updatedUser) {
            const userWithLockedAndToken = sanitizeMemoUserWithToken(
              updatedUser,
              signedToken
            )
            res.send(userWithLockedAndToken)
          } else {
            res.status(500).send({ error: '사용자 업데이트에 실패했습니다.' })
          }
        } else {
          const userWithLockedAndToken = sanitizeMemoUserWithToken(
            existingUser,
            signedToken
          )
          res.send(userWithLockedAndToken)
        }
      } else {
        const newUser = new MemoUserModel(user)
        const savedUser = await newUser.save()
        const userWithLockedAndToken = sanitizeMemoUserWithToken(
          savedUser,
          signedToken
        )
        res.send(userWithLockedAndToken)
      }
    } else {
      res.status(400).send({ error: 'credential가 필요합니다.' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
})

userRouter.post(urls.logout, async (req, res) => {
  res.send({ success: true, message: '로그아웃되었습니다.' })
})

userRouter.post(urls.checkLogin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const secret = process.env.GOOGLE_SECRET

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .send({ error: 'Authorization Bearer 토큰이 필요합니다.' })
    }

    if (!secret) {
      console.error('GOOGLE_SECRET 환경변수가 설정되지 않았습니다.')
      return res.status(500).send({ error: '서버 설정 오류' })
    }

    const bearerToken = authHeader.substring(7) // "Bearer " 제거

    try {
      const decodedToken = jwt.verify(bearerToken, secret, {
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      }) as jwt.JwtPayload

      const foundUser = await MemoUserModel.findOne({
        email: decodedToken.email,
        sub: decodedToken.sub,
      })

      if (foundUser) {
        const userWithLockedAndToken = sanitizeMemoUserWithToken(
          foundUser,
          bearerToken
        )
        res.send(userWithLockedAndToken)
      } else {
        res.status(404).send({ error: '사용자를 찾을 수 없습니다.' })
      }
    } catch (jwtError) {
      console.error('JWT 검증 오류:', jwtError)
      res.status(401).send({ error: '유효하지 않은 토큰입니다.' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '서버 오류가 발생했습니다.' })
  }
})

userRouter.post(
  urls.setLock,
  async (req: Request<Record<string, never>, unknown, PasswordBody>, res) => {
    try {
      const { password } = req.body
      const decodedUser = req.memoUser

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
  }
)

userRouter.post(
  urls.unlock,
  async (req: Request<Record<string, never>, unknown, PasswordBody>, res) => {
    try {
      const { password } = req.body
      const decodedUser = req.memoUser

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
  }
)

userRouter.post(
  urls.removeLock,
  async (req: Request<Record<string, never>, unknown, PasswordBody>, res) => {
    try {
      const { password } = req.body
      const decodedUser = req.memoUser

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
        if (!isValidPassword) {
          return res
            .status(401)
            .send({ error: '비밀번호가 일치하지 않습니다.' })
        }
        user.hashedLockPassword = undefined
        await user.save()
        res.send({ success: true, message: '잠금 비밀번호가 제거되었습니다.' })
      } else {
        console.info(
          `[removeLock fail] ${decodedUser.email}, ${decodedUser.sub}`
        )
        res.status(404).send({
          error: '사용자를 찾을 수 없거나 비밀번호가 설정되지 않았습니다.',
        })
      }
    } catch (err) {
      console.error(err)
      res.status(500).send({ error: '서버 오류가 발생했습니다.' })
    }
  }
)

export default userRouter
