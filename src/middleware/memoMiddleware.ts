import { Request } from 'express'
import jwt from 'jsonwebtoken'

export const sessionCheck = (req: Request) => {
  const secret = process.env.GOOGLE_SECRET || ''
  // 세션 있는 경우 체크
  if (req.cookies.go_memo_session) {
    try {
      const user = jwt.verify(
        req.cookies.go_memo_session,
        secret
      ) as jwt.JwtPayload

      if (user && user.email) {
        req.body = {
          ...req.body,
          decodedUser: user,
        }
        console.info(
          `### session: ${user.name}, ${user.email}, ${req.ip}, ${req.url}`
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
