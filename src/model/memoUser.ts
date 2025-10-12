import mongoose, { InferSchemaType } from 'mongoose'

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

// 스키마에서 타입 자동 추출
export type MemoUserDocument = InferSchemaType<typeof MemoUserSchema>

// collection name: memousers
export const MemoUserModel = mongoose.model<MemoUserDocument>(
  'memoUser',
  MemoUserSchema
)
