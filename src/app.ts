import express, { NextFunction, Request, Response } from 'express'
import { createServer } from 'node:http'

import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import memoRouter from './router/memo'
import { sessionCheck } from './middleware/memoMiddleware'

import accountBookRouter from './router/accountBook'
import { accountBookSessionCheck } from './middleware/accountBookMiddleware'
import { catbookRouter } from './router/catbook'
import { startDatabase } from './database'
import { startPreventSleep } from './preventSleep'
import { logProcessError } from './processErrorLogger'
import { responseBodyDataMeasurementMiddleware } from './responseBodyDataMeasurement'

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
app.use(responseBodyDataMeasurementMiddleware)
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
app.get('/ping', (req: Request, res: Response) => {
  res.sendStatus(204)
})

// 전역 에러 핸들러
app.use(
  (
    error: Error,
    req: Request,
    res: Response,
    // WARNING: Express recognizes error middleware by its four-parameter arity, so _next must remain.
    _next: NextFunction
  ) => {
    console.error('[GlobalErrorHandler] Unhandled error:', error.message)
    res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Something went wrong',
    })
  }
)

// 404 핸들러
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// 프로세스 에러 핸들러
process.on('uncaughtException', (error: Error) => {
  logProcessError('[UncaughtException] Fatal error:', error)
  // 서버를 종료하지 않고 로그만 남기고 계속 실행
})

process.on('unhandledRejection', (reason: unknown) => {
  logProcessError('[UnhandledRejection] Unhandled promise rejection:', reason)
  // 서버를 종료하지 않고 로그만 남기고 계속 실행
})

// app 실행
const server = createServer(app)

server.once('error', (error: Error) =>
  logProcessError('[ServerStartError] Failed to bind server:', error)
)

server.listen(process.env.PORT || '4001', () => {
  console.info(`
[serverStart]
🐈 Server listening on port: ${process.env.PORT || 4001} 🐈
NODE_ENV: ${process.env.NODE_ENV}
`)

  startDatabase()
  startPreventSleep()
})
