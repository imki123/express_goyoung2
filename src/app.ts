import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import memoRouter from './router/memo/memo'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

app.use(cookieParser())
app.use('/memo', memoRouter)
app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('welcome!')
})

// console.log('>> secret:', process.env.GOOGLE_SECRET)

app.listen('1234', () => {
  console.log(`
  ################################################
  🛡️ Server listening on port: 1234 🛡️
  ################################################
`)
})
