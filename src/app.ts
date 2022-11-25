import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import memoRouter from './router/memo/memo'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

const urls = {
  root: '/',
  memo: '/memo',
}

app.get(urls.root, (req: Request, res: Response, next: NextFunction) => {
  res.send('welcome!')
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
