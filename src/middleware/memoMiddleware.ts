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

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const bearerToken = authHeader.substring(7) // "Bearer " 제거
      const decodedUser = jwt.verify(bearerToken, secret, {
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      }) as MemoUserDocument & jwt.JwtPayload

      if (decodedUser && decodedUser.email) {
        // DB에서 사용자 정보를 조회하여 locked 상태 포함
        const foundUser = await MemoUserModel.findOne({
          email: decodedUser.email,
          sub: decodedUser.sub,
        })

        const userWithLocked = {
          ...decodedUser,
          locked: !!foundUser?.hashedLockPassword,
        }

        req.body = { ...req.body, decodedUser: userWithLocked }

        const shouldRefreshToken = shouldRefreshJwtToken(decodedUser)
        if (shouldRefreshToken && req.res) {
          const newSignedToken = jwt.sign(decodedUser, secret, {
            expiresIn: '60d',
            issuer: 'express_goyoung2',
            audience: 'memo_app',
          })
          // 토큰을 응답 헤더에 포함하여 클라이언트가 새 토큰을 받을 수 있도록 함
          req.res.setHeader('X-New-Token', newSignedToken)
          console.info(
            `[tokenRefresh] ${decodedUser.name}, ${decodedUser.email}`
          )
        }

        console.info(
          `[sessionCheck] ${decodedUser.name}, ${decodedUser.email}, ${req.ip}, ${req.url}`
        )
      } else {
        console.info(`[invalidJwt] ${req.ip}, ${req.url}`)
      }
    } catch (err) {
      console.error(`sessionCheck error: ${req.ip}, ${req.url}, ${err}`)
    }
  } else {
    console.info(`[noToken] ${req.ip}, ${req.url}`)
  }
}
