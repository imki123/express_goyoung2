import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import memoRouter from './router/memo/memo'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()
const app = express()

const urls = {
  root: '/',
  memo: '/memo',
}

app.get(urls.root, (req: Request, res: Response, next: NextFunction) => {
  res.send(urls)
})
app.use(cookieParser())
app.use(urls.memo, memoRouter)

// console.log('>> secret:', process.env.GOOGLE_SECRET)

app.listen('1234', () => {
  console.log(`
  ################################################
  🛡️ Server listening on port: 1234 🛡️
  ################################################
`)
})

// render sleep 방지
setInterval(function () {
  axios.get(process.env.BE_URL || '')
}, 1000 * 60 * 10) //10분
