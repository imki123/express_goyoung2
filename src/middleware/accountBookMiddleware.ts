import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { MemoUserDocument, MemoUserModel } from '../model/memoUser'

export const accountBookSessionCheck = async (req: Request) => {
  const secret = process.env.JWT_SECRET

  // 환경변수 검증
  if (!secret) {
    console.error('JWT_SECRET 환경변수가 설정되지 않았습니다.')
    return
  }

  // 액세스 토큰 있는지 체크
  const session = req.headers.authorization?.replace('Bearer ', '')

  // 세션 있는 경우 체크
  if (session) {
    try {
      const user = jwt.verify(session, secret, {
        issuer: 'express_goyoung2',
        audience: 'account_book_app',
      }) as MemoUserDocument & jwt.JwtPayload

      if (user && user.email) {
        // DB에서 사용자 정보를 조회하여 locked 상태 포함
        const dbUser = await MemoUserModel.findOne({
          email: user.email,
          sub: user.sub,
        })

        const userWithLocked = {
          ...user,
          locked: !!dbUser?.hashedLockPassword,
        }

        req.body = {
          ...req.body,
          decodedUser: userWithLocked,
          session,
        }
        console.info(
          `[sessionCheck] ${user.username || user.name}, ${user.email}, ${
            req.ip
          }, ${req.url}`
        )
      } else {
        console.warn(`[invalidJwt] ${req.ip}, ${req.url}`)
      }
    } catch (err) {
      console.error(`sessionCheck error: ${req.ip}, ${req.url}, ${err}`)
      // JWT 검증 실패 시 401 응답을 위해 에러를 다시 던짐
      throw new Error('Invalid or expired token')
    }
  } else {
    console.info(`[noSession] ${req.ip}, ${req.url}`)
  }
}
