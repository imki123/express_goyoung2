import express, { Request, Response } from 'express'

import axios from 'axios'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import memoRouter from './router/memo'
import mongoose from 'mongoose'
import { sessionCheck } from './middleware/memoMiddleware'

mongoose.set('strictQuery', false) // Mongoose deprecation warning 해결
import accountBookRouter from './router/accountBook'
import { accountBookSessionCheck } from './middleware/accountBookMiddleware'
import { catbookRouter } from './router/catbook'

dotenv.config()
export const app = express()

const corsOptions = {
  origin: [
    'http://127.0.0.1:4000',
    'http://localhost:4000',
    'http://localhost:19006',
    'https://imki123.github.io',
  ],
  credentials: true,
}
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(bodyParser.json())

// memo middleWare 등록
app.use(/^\/memo/, async (req, res, next) => {
  await sessionCheck(req)
  next()
})
app.use(/^\/accountBook/, (req, res, next) => {
  accountBookSessionCheck(req)
  next()
})

const urls = {
  root: '/',
  memo: '/memo',
  accountBook: '/accountBook',
  catbook: '/catbook',
}

app.get(urls.root, (req: Request, res: Response) => {
  res.send(urls)
})
app.use(urls.memo, memoRouter)
app.use(urls.accountBook, accountBookRouter)
app.use(urls.catbook, catbookRouter)

// DB 연결 재시도 로직
const connectDBWithRetry = async (retryCount = 0, maxRetries = 10) => {
  const baseDelay = 1000 // 1초
  const maxDelay = 30000 // 30초
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)

  try {
    await mongoose.connect(process.env.MONGO_DB_URI || '')
    console.info(`[dbConnected] retryCount: ${retryCount}
MONGO_DB_URI: ${process.env.MONGO_DB_URI}
`)
  } catch (err) {
    const error = err as Error
    console.error(
      `[dbRetry] Attempt ${retryCount + 1}/${maxRetries + 1} failed:`,
      error.message
    )

    if (retryCount < maxRetries) {
      console.info(`[dbRetry] Retrying in ${delay}ms...`)
      setTimeout(() => {
        connectDBWithRetry(retryCount + 1, maxRetries)
      }, delay)
    } else {
      console.error(
        '[dbFailed] Max retries reached. DB connection failed permanently.'
      )
    }
  }
}

connectDBWithRetry()

// DB 연결 상태 모니터링
mongoose.connection.on('disconnected', () => {
  console.warn(
    '[dbDisconnected] MongoDB disconnected. Attempting to reconnect...'
  )
  connectDBWithRetry()
})

mongoose.connection.on('error', (err) => {
  console.error('[dbError] MongoDB connection error:', err)
})

// app 실행
app.listen(process.env.PORT || '4001', () => {
  console.info(`
[serverStart]
🐈 Server listening on port: ${process.env.PORT || 4001} 🐈
NODE_ENV: ${process.env.NODE_ENV}
`)
})

// render sleep 방지
if (process.env.NODE_ENV === 'production') {
  setInterval(function () {
    console.info('*** Prevent to sleep *** ')
    axios.get(process.env.BE_URL || '')
  }, 1000 * 60 * 10) //10분
}
