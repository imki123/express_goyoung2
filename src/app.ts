import express, { Request, Response } from 'express'

import axios from 'axios'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import memoRouter from './router/memo'
import mongoose from 'mongoose'
import { sessionCheck } from './middleware/memoMiddleware'

dotenv.config()
export const app = express()

const corsOptions = {
  origin: ['http://localhost:4000', 'https://imki123.github.io'],
  credentials: true,
}
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(bodyParser.json())

// memo middleWare 등록
app.use(/^\/memo/, (req, res, next) => {
  sessionCheck(req, res)
  next()
})

const urls = {
  root: '/',
  memo: '/memo',
}

app.get(urls.root, (req: Request, res: Response) => {
  res.send(urls)
})
app.use(urls.memo, memoRouter)

// DB 연결
mongoose
  .connect(process.env.MONGO_DB_URI || '')
  .then(() => {
    console.info('### DB connection success ###')
  })
  .catch((err) => {
    console.info('!!! DB connection fail !!! :', err)
  })

// app 실행
app.listen(process.env.PORT || '4001', () => {
  console.info(`
#######################################
🐈 Server listening on port: ${process.env.PORT || 4001} 🐈
NODE_ENV: ${process.env.NODE_ENV}
#######################################
`)
})

// render sleep 방지
setInterval(function () {
  console.info('*** Prevent to sleep *** ')
  axios.get(process.env.BE_URL || '')
}, 1000 * 60 * 10) //10분
