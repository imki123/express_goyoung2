import mongoose from 'mongoose'


export const MemoMemoSchema = new mongoose.Schema({
  memoId: { type: Number, required: true },
  email: { type: String, required: true },
  sub: { type: String, required: true },
  text: String,
  createdAt: String,
  editedAt: String,
})

// collection name: memomemos
export const MemoMemoModel = mongoose.model('memoMemo', MemoMemoSchema)
