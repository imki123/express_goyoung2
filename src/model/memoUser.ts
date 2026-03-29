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

// JWT 페이로드 전용 타입 - 토큰 서명/검증 시에만 사용
export type MemoJwtPayload = Pick<MemoUserDocument, 'email' | 'sub' | 'name' | 'picture'>

// collection name: memousers
export const MemoUserModel = mongoose.model<MemoUserDocument>(
  'memoUser',
  MemoUserSchema
)
