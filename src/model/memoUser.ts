import mongoose from 'mongoose'

export const MemoUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    sub: { type: String, required: true },
    name: String,
    picture: String,
    hashedLockPassword: String,
    locked: Boolean,
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
)

export interface MemoUserDocument {
  email: string
  sub: string
  name?: string
  picture?: string
  hashedLockPassword?: string
  locked?: boolean
  _id: string
  createdAt: Date
  updatedAt: Date
}

// collection name: memousers
export const MemoUserModel = mongoose.model<MemoUserDocument>(
  'memoUser',
  MemoUserSchema
)
