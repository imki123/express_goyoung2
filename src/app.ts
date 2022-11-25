import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import memoRouter from './router/memo/memo'
import dotenv from 'dotenv'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'

dotenv.config()
const app = express()

var corsOptions = {
  origin: ['http://localhost:4000', 'https://imki123.github.io'],
}
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(bodyParser.json())

const urls = {
  root: '/',
  memo: '/memo',
}

app.get(urls.root, (req: Request, res: Response, next: NextFunction) => {
  res.send(urls)
})

app.use(urls.memo, memoRouter)

// console.log('>> secret:', process.env.GOOGLE_SECRET)

app.listen(process.env.PORT || '4001', () => {
  console.log(`
  ################################################
  🛡️ Server listening on port: ${process.env.PORT || 4001} 🛡️
  ################################################
`)
})

// render sleep 방지
setInterval(function () {
  axios.get(process.env.BE_URL || '')
}, 1000 * 60 * 10) //10분
