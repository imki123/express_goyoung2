import dayjs from 'dayjs'
import { CookieOptions } from 'express'


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

// 쿠키 생성 기본 365일
export const cookieExpire = (day = 365) => dayjs().add(day, 'day').toDate()
