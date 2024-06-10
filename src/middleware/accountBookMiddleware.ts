import { Request } from 'express'
import jwt from 'jsonwebtoken'

export const accountBookSessionCheck = async (req: Request) => {
  // 액세스 토큰 있는지 체크
  const session = req.headers.authorization?.replace('Bearer ', '')

  // 세션 있는 경우 체크
  if (session) {
    try {
      const user = jwt.verify(
        session,
        process.env.JWT_SECRET || ''
      ) as jwt.JwtPayload

      if (user && user.email) {
        req.body = {
          ...req.body,
          decodedUser: user,
          session,
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
