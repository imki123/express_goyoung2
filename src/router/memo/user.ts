import { MemoUserModel, MemoJwtPayload } from '../../model/memoUser'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { verifyGoogleCredential } from './googleAuth'
import { logProcessError } from '../../processErrorLogger'
import { resolveMemoOwnership } from './ownership'
import { registerMemoLockRoutes } from './lock'

const userRouter = Router()

type MemoUserResponse = MemoJwtPayload & {
  locked: boolean
  token: string
}

const sanitizeMemoUserWithToken = (
  user: MemoJwtPayload,
  accessToken: string,
  locked: boolean
): MemoUserResponse => ({
  email: user.email,
  sub: user.sub,
  name: user.name,
  picture: user.picture,
  locked,
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

      const ownership = await resolveMemoOwnership(user)
      if (!ownership) {
        return res.status(403).send({ error: '메모 소유자 설정이 올바르지 않습니다.' })
      }

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
            const lockOwner = ownership.canonicalUser || updatedUser
            const userWithLockedAndToken = sanitizeMemoUserWithToken(
              updatedUser,
              signedToken,
              !!lockOwner.hashedLockPassword
            )
            res.send(userWithLockedAndToken)
          } else {
            res.status(500).send({ error: '사용자 업데이트에 실패했습니다.' })
          }
        } else {
          const lockOwner = ownership.canonicalUser || existingUser
          const userWithLockedAndToken = sanitizeMemoUserWithToken(
            existingUser,
            signedToken,
            !!lockOwner.hashedLockPassword
          )
          res.send(userWithLockedAndToken)
        }
      } else {
        const newUser = new MemoUserModel(user)
        const savedUser = await newUser.save()
        const lockOwner = ownership.canonicalUser || savedUser
        const userWithLockedAndToken = sanitizeMemoUserWithToken(
          savedUser,
          signedToken,
          !!lockOwner.hashedLockPassword
        )
        res.send(userWithLockedAndToken)
      }
    } else {
      res.status(400).send({ error: 'credential가 필요합니다.' })
    }
  } catch (err) {
    logProcessError('[memoLogin] Error:', err)
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
        const ownership = await resolveMemoOwnership({
          email: foundUser.email,
          sub: foundUser.sub,
        })
        if (!ownership) {
          return res
            .status(403)
            .send({ error: '메모 소유자 설정이 올바르지 않습니다.' })
        }
        const lockOwner = ownership.canonicalUser || foundUser
        const userWithLockedAndToken = sanitizeMemoUserWithToken(
          foundUser,
          bearerToken,
          !!lockOwner.hashedLockPassword
        )
        res.send(userWithLockedAndToken)
      } else {
        res.status(404).send({ error: '사용자를 찾을 수 없습니다.' })
      }
    } catch (jwtError) {
      logProcessError('JWT 검증 오류:', jwtError)
      res.status(401).send({ error: '유효하지 않은 토큰입니다.' })
    }
  } catch (err) {
    logProcessError('[checkLogin] Error:', err)
    res.status(500).send({ error: '서버 오류가 발생했습니다.' })
  }
})

registerMemoLockRoutes(userRouter, urls)

export default userRouter
