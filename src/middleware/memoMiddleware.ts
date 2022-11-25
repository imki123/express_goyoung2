import { Request, Response } from 'express'
import { app } from '../app'

export const sessionCheck = (req: Request, res: Response) => {
  console.log('>>> cookies:', req.cookies)
}
