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
  try {
    await sessionCheck(req)
    next()
  } catch (error) {
    console.error('[memoMiddleware] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.use(/^\/accountBook/, async (req, res, next) => {
  try {
    await accountBookSessionCheck(req)
    next()
  } catch (error) {
    console.error('[accountBookMiddleware] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
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

// 전역 에러 핸들러
app.use((error: Error, req: Request, res: Response) => {
  console.error('[GlobalErrorHandler] Unhandled error:', error)
  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Something went wrong',
  })
})

// 404 핸들러
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

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
  console.error(
    '[dbDisconnected] MongoDB disconnected. Attempting to reconnect...'
  )
  connectDBWithRetry()
})

mongoose.connection.on('error', (err) => {
  console.error('[dbError] MongoDB connection error:', err)
})

// 프로세스 에러 핸들러
process.on('uncaughtException', (error: Error) => {
  console.error('[UncaughtException] Fatal error:', error)
  // 서버를 종료하지 않고 로그만 남기고 계속 실행
})

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UnhandledRejection] Unhandled promise rejection:', reason)
  // 서버를 종료하지 않고 로그만 남기고 계속 실행
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
const mainUrl = process.env.MAIN_SERVER_URL
const subUrl = process.env.SUB_SERVER_URL

if (mainUrl) {
  axios.get(mainUrl).catch((error) => {
    console.error('[preventSleep] Main Server Error:', error)
  })
}

if (subUrl) {
  axios.get(subUrl).catch((error) => {
    console.error('[preventSleep] Sub Server Error:', error)
  })
}

setInterval(function () {
  const mainUrl = process.env.MAIN_SERVER_URL
  const subUrl = process.env.SUB_SERVER_URL

  if (mainUrl) {
    axios.get(mainUrl).catch((error) => {
      console.error('[preventSleep] Main Server Error:', error)
    })
  }

  if (subUrl) {
    axios.get(subUrl).catch((error) => {
      console.error('[preventSleep] Sub Server Error:', error)
    })
  }
}, 1000 * 60 * 10)
