import type { Request, Response, Router } from 'express'
import bcrypt from 'bcrypt'
import { MemoUserModel, type MemoJwtPayload } from '../../model/memoUser'
import { logProcessError } from '../../processErrorLogger'
import { resolveMemoOwnership } from './ownership'

type PasswordBody = {
  password: string
}

type MemoLockRequest = Request<Record<string, never>, unknown, PasswordBody> & {
  memoUser?: MemoJwtPayload & { locked: boolean }
  memoOwnershipConfigurationError?: true
}

type MemoLockUrls = {
  readonly setLock: string
  readonly removeLock: string
  readonly unlock: string
}

const sendOwnershipError = (res: Response) =>
  res.status(403).send({ error: '메모 소유자 설정이 올바르지 않습니다.' })

export const registerMemoLockRoutes = (
  userRouter: Router,
  urls: MemoLockUrls
) => {
  userRouter.post(
    urls.setLock,
    async (req: MemoLockRequest, res) => {
      try {
        const { password } = req.body
        if (req.memoOwnershipConfigurationError) {
          return sendOwnershipError(res)
        }
        const decodedUser = req.memoUser

        if (!decodedUser) {
          return res.status(401).send({ error: '인증이 필요합니다.' })
        }

        const ownership = await resolveMemoOwnership(decodedUser)
        if (!ownership) {
          return sendOwnershipError(res)
        }
        const user =
          ownership.canonicalUser ||
          (await MemoUserModel.findOne(ownership.owner))

        if (user) {
          const saltRounds = 12
          const hashedLockPassword = await bcrypt.hash(password, saltRounds)
          user.hashedLockPassword = hashedLockPassword
          await user.save()
          res.send({ success: true, message: '비밀번호가 설정되었습니다.' })
        } else {
          res.status(404).send({ error: '사용자를 찾을 수 없습니다.' })
        }
      } catch (err) {
        logProcessError('[setLock] Error:', err)
        res.status(500).send({ error: '서버 오류가 발생했습니다.' })
      }
    }
  )

  userRouter.post(
    urls.unlock,
    async (req: MemoLockRequest, res) => {
      try {
        const { password } = req.body
        if (req.memoOwnershipConfigurationError) {
          return sendOwnershipError(res)
        }
        const decodedUser = req.memoUser

        if (!decodedUser) {
          return res.status(401).send({ error: '인증이 필요합니다.' })
        }

        const ownership = await resolveMemoOwnership(decodedUser)
        if (!ownership) {
          return sendOwnershipError(res)
        }
        const user =
          ownership.canonicalUser ||
          (await MemoUserModel.findOne(ownership.owner))

        if (user && user.hashedLockPassword) {
          const isValidPassword = await bcrypt.compare(
            password,
            user.hashedLockPassword
          )
          if (isValidPassword) {
            res.send({ success: true, message: '잠금이 해제되었습니다.' })
          } else {
            res.status(401).send({ error: '비밀번호가 일치하지 않습니다.' })
          }
        } else {
          res.status(404).send({
            error: '사용자를 찾을 수 없거나 비밀번호가 설정되지 않았습니다.',
          })
        }
      } catch (err) {
        logProcessError('[unlock] Error:', err)
        res.status(500).send({ error: '비밀번호 검증 중 오류가 발생했습니다.' })
      }
    }
  )

  userRouter.post(
    urls.removeLock,
    async (req: MemoLockRequest, res) => {
      try {
        const { password } = req.body
        if (req.memoOwnershipConfigurationError) {
          return sendOwnershipError(res)
        }
        const decodedUser = req.memoUser

        if (!decodedUser) {
          return res.status(401).send({ error: '인증이 필요합니다.' })
        }

        const ownership = await resolveMemoOwnership(decodedUser)
        if (!ownership) {
          return sendOwnershipError(res)
        }
        const user =
          ownership.canonicalUser ||
          (await MemoUserModel.findOne(ownership.owner))

        if (user && user.hashedLockPassword) {
          const isValidPassword = await bcrypt.compare(
            password,
            user.hashedLockPassword
          )
          if (!isValidPassword) {
            return res
              .status(401)
              .send({ error: '비밀번호가 일치하지 않습니다.' })
          }
          user.hashedLockPassword = undefined
          await user.save()
          res.send({ success: true, message: '잠금 비밀번호가 제거되었습니다.' })
        } else {
          console.info(
            `[removeLock fail] ${decodedUser.email}, ${decodedUser.sub}`
          )
          res.status(404).send({
            error: '사용자를 찾을 수 없거나 비밀번호가 설정되지 않았습니다.',
          })
        }
      } catch (err) {
        logProcessError('[removeLock] Error:', err)
        res.status(500).send({ error: '서버 오류가 발생했습니다.' })
      }
    }
  )
}
