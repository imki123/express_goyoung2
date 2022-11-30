import { CookieOptions } from 'express'
import dayjs from 'dayjs'

export const cookieKeys = {
  go_memo_session: 'go_memo_session',
}

const setCookieSecure = (): CookieOptions => {
  if (process.env.NODE_ENV === 'production') {
    return {
      secure: true,
      sameSite: 'none',
    }
  } else {
    return {}
  }
}

export const cookieOptions = (option?: CookieOptions): CookieOptions => ({
  expires: cookieExpire(),
  ...setCookieSecure(),
  ...option,
})

// 쿠키 생성 기본 365일, GMT+9시간
export const cookieExpire = (day = 365) =>
  dayjs().add(day, 'day').add(9, 'hour').toDate()
