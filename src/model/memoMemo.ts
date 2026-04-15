import mongoose, { InferSchemaType } from 'mongoose'

export const MemoMemoSchema = new mongoose.Schema({
  memoId: { type: Number, required: true },
  email: { type: String, required: true },
  sub: { type: String, required: true },
  text: String,
  createdAt: String,
  editedAt: String,
})

MemoMemoSchema.index({ email: 1, sub: 1, memoId: 1 }, { unique: true })

export type MemoMemoDocument = InferSchemaType<typeof MemoMemoSchema>

// collection name: memomemos
export const MemoMemoModel = mongoose.model<MemoMemoDocument>(
  'memoMemo',
  MemoMemoSchema
)
