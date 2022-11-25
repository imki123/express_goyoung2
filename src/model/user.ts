import mongoose from 'mongoose'

export const MemoUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  sub: { type: String, required: true },
  name: String,
  picture: String,
})

export const MemoUserModel = mongoose.model('memoUser', MemoUserSchema)
