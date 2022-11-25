import { Request, Response } from 'express'
import { app } from '../app'
import jwt from 'jsonwebtoken'

export const sessionCheck = (req: Request, res: Response) => {
  const secret = process.env.GOOGLE_SECRET || ''
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
      console.log(
        `### session: ${user.name}, ${user.email}, ${req.ip}, ${req.url}`
      )
    } else {
      console.log(`### No session: ${req.ip}, ${req.url}`)
    }
  } catch (err) {
    console.error(`sessionCheck error: ${req.ip}, ${req.url},
${err}`)
  }
}
