import { CookieOptions } from 'express'
import dayjs from 'dayjs'

export const cookieKeys = {
  go_memo_session: 'go_memo_session',
}

declare module 'express' {
  export interface CookieOptions {
    partitioned?: boolean
  }
}

const defaultCookieOption: CookieOptions = {
  // 예전에는 secure 옵션이 https에서만 됐었는데... 이제 로컬에서도 잘된다?
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  partitioned: true,
}

export const cookieOptions = (option?: CookieOptions): CookieOptions => ({
  expires: cookieExpire(),
  ...defaultCookieOption,
  ...option,
})

// 쿠키 생성 기본 365일, GMT+9시간
export const cookieExpire = (day = 365) =>
  dayjs()
    .add(day, 'day')
    .add(process.env.NODE_ENV === 'production' ? 9 : 0, 'hour')
    .toDate()
