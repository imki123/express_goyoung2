import type { MemoJwtPayload } from '../model/memoUser'

declare global {
  namespace Express {
    interface Request {
      memoUser?: MemoJwtPayload & { locked: boolean }
    }
  }
}

export {}
