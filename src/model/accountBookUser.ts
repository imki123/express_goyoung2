import mongoose, { InferSchemaType } from 'mongoose'

export const AccountBookUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: String,
    picture: String,
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
)

// 스키마에서 타입 자동 추출
export type AccountBookUserDocument = InferSchemaType<
  typeof AccountBookUserSchema
>

// JWT 페이로드 전용 타입 - 토큰 서명/검증 시에만 사용
export type AccountBookJwtPayload = Pick<
  AccountBookUserDocument,
  'email' | 'name' | 'picture'
>

// collection name: accountbookusers
export const AccountBookUserModel = mongoose.model<AccountBookUserDocument>(
  'accountBookUser',
  AccountBookUserSchema
)
