import { Request } from 'express'
import jwt from 'jsonwebtoken'

export const accountBookSessionCheck = async (req: Request) => {
  // 액세스 토큰 있는지 체크
  const token = req.cookies.account_book_access_token
  // 세션 있는 경우 체크
  if (token) {
    try {
      const user = jwt.verify(
        token,
        process.env.JWT_SECRET || ''
      ) as jwt.JwtPayload

      if (user && user.email) {
        req.body = {
          ...req.body,
          decodedUser: user,
        }
        console.info(
          `### session: ${user.username}, ${user.email}, ${req.ip}, ${req.url}`
        )
      }
    } catch (err) {
      console.error(`sessionCheck error: ${req.ip}, ${req.url},
  ${err}`)
    }
  } else {
    console.info(`### No session: ${req.ip}, ${req.url}`)
  }
}
