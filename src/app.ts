import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import memoRouter from './router/memo/memo'
import dotenv from 'dotenv'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import { sessionCheck } from './middleware/memoMiddleware'

dotenv.config()
export const app = express()

var corsOptions = {
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

app.get(urls.root, (req: Request, res: Response, next: NextFunction) => {
  res.send(urls)
})
app.use(urls.memo, memoRouter)

// DB 연결
mongoose
  .connect(process.env.MONGO_DB_URI || '')
  .then(() => {
    console.log('### DB connection success ###')
  })
  .catch((err) => {
    console.log('!!! DB connection fail !!! :', err)
  })

// app 실행
app.listen(process.env.PORT || '4001', () => {
  console.log(`
#######################################
🐈 Server listening on port: ${process.env.PORT || 4001} 🐈
#######################################
`)
})

// render sleep 방지
setInterval(function () {
  axios.get(process.env.BE_URL || '')
}, 1000 * 60 * 10) //10분
