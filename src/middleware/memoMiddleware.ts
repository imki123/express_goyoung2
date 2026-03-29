import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { MemoJwtPayload, MemoUserModel } from '../model/memoUser'

const shouldRefreshJwtToken = (decoded: jwt.JwtPayload): boolean => {
  if (!decoded.exp || !decoded.iat) return true

  const now = Math.floor(Date.now() / 1000)
  const tokenAge = now - decoded.iat
  const timeUntilExpiry = decoded.exp - now

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
      const bearerToken = authHeader.substring(7)
      const decoded = jwt.verify(bearerToken, secret, {
        issuer: 'express_goyoung2',
        audience: 'memo_app',
      }) as MemoJwtPayload & jwt.JwtPayload

      if (decoded.email) {
        const foundUser = await MemoUserModel.findOne({
          email: decoded.email,
          sub: decoded.sub,
        })

        const decodedUser: MemoJwtPayload & { locked: boolean } = {
          email: decoded.email,
          sub: decoded.sub,
          name: decoded.name,
          picture: decoded.picture,
          locked: !!foundUser?.hashedLockPassword,
        }

        req.body = { ...req.body, decodedUser }

        if (shouldRefreshJwtToken(decoded) && req.res) {
          const payload: MemoJwtPayload = {
            email: decoded.email,
            sub: decoded.sub,
            name: decoded.name,
            picture: decoded.picture,
          }
          const newSignedToken = jwt.sign(payload, secret, {
            expiresIn: '60d',
            issuer: 'express_goyoung2',
            audience: 'memo_app',
          })
          req.res.setHeader('X-New-Token', newSignedToken)
          console.info(`[tokenRefresh] ${decoded.name}, ${decoded.email}`)
        }

        console.info(
          `[sessionCheck] ${decoded.name}, ${decoded.email}, ${req.ip}, ${req.url}`
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
