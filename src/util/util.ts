import dayjs from 'dayjs'

// 쿠키 생성 기본 365일
export const cookieExpire = (day = 365) => dayjs().add(day, 'day').toDate()
