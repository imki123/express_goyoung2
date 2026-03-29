import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { AccountBookJwtPayload } from '../model/accountBookUser'

export const accountBookSessionCheck = async (req: Request) => {
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
        audience: 'account_book_app',
      }) as AccountBookJwtPayload & jwt.JwtPayload

      if (decoded.email) {
        const decodedUser: AccountBookJwtPayload = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        }
        req.body = { ...req.body, decodedUser, token: bearerToken }
        console.info(
          `[tokenCheck] ${decoded.name}, ${decoded.email}, ${req.ip}, ${req.url}`
        )
      } else {
        console.info(`[invalidJwt] ${req.ip}, ${req.url}`)
      }
    } catch (err) {
      console.error(`tokenCheck error: ${req.ip}, ${req.url}, ${err}`)
    }
  } else {
    console.info(`[noToken] ${req.ip}, ${req.url}`)
  }
}
