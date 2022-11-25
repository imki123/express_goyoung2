import mongoose from 'mongoose'

export const MemoUser = new mongoose.Schema({
  name: String,
  email: { type: String, required: true },
  picture: String,
})
