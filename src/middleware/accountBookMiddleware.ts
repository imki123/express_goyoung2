import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { AccountBookUserDocument } from '../model/accountBookUser'

export const accountBookSessionCheck = async (req: Request) => {
  const secret = process.env.JWT_SECRET

  // 환경변수 검증
  if (!secret) {
    console.error('JWT_SECRET 환경변수가 설정되지 않았습니다.')
    return
  }

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const bearerToken = authHeader.substring(7) // "Bearer " 제거
      const decodedUser = jwt.verify(bearerToken, secret, {
        issuer: 'express_goyoung2',
        audience: 'account_book_app',
      }) as AccountBookUserDocument & jwt.JwtPayload

      if (decodedUser && decodedUser.email) {
        req.body = {
          ...req.body,
          decodedUser: decodedUser,
          session: bearerToken,
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
