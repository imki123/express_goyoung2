import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { MemoUserDocument, MemoUserModel } from '../model/memoUser'

const shouldRefreshJwtToken = (
  user: MemoUserDocument & jwt.JwtPayload
): boolean => {
  if (!user.exp || !user.iat) return true

  const now = Math.floor(Date.now() / 1000)
  const tokenAge = now - user.iat
  const timeUntilExpiry = user.exp - now

  return tokenAge > 30 * 24 * 60 * 60 || timeUntilExpiry < 30 * 24 * 60 * 60
}

export const sessionCheck = async (req: Request) => {
  const secret = process.env.GOOGLE_SECRET

  if (!secret) {
    console.error('GOOGLE_SECRET 환경변수가 설정되지 않았습니다.')
    return
  }

  if (req.cookies.go_memo_session) {
    try {
      const decodedUser = jwt.verify(req.cookies.go_memo_session, secret, {
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      }) as MemoUserDocument & jwt.JwtPayload

      if (decodedUser && decodedUser.email) {
        // DB에서 사용자 정보를 조회하여 locked 상태 포함
        const user = await MemoUserModel.findOne({
          email: decodedUser.email,
          sub: decodedUser.sub,
        })

        const userWithLocked = {
          ...decodedUser,
          locked: !!user?.hashedLockPassword,
        }

        req.body = { ...req.body, decodedUser: userWithLocked }

        const shouldRefreshToken = shouldRefreshJwtToken(decodedUser)
        if (shouldRefreshToken && req.res) {
          const secret = process.env.GOOGLE_SECRET
          if (secret) {
            const newToken = jwt.sign(decodedUser, secret, {
              expiresIn: '60d',
              issuer: 'express_goyoung2',
              audience: 'memo_app',
            })
            req.res.cookie('go_memo_session', newToken, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              partitioned: true,
              expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            })
            console.info(
              `[tokenRefresh] ${decodedUser.name}, ${decodedUser.email}`
            )
          }
        }

        console.info(
          `[sessionCheck] ${decodedUser.name}, ${decodedUser.email}, ${req.ip}, ${req.url}`
        )
      } else {
        console.warn(`[invalidJwt] ${req.ip}, ${req.url}`)
      }
    } catch (err) {
      console.error(`sessionCheck error: ${req.ip}, ${req.url}, ${err}`)
      if (req.res) {
        req.res.clearCookie('go_memo_session')
      }
    }
  } else {
    console.info(`[noSession] ${req.ip}, ${req.url}`)
  }
}
