import mongoose from 'mongoose'

const TypeSchema = new mongoose.Schema({
  typeId: Number,
  types: [],
})

export const Type = mongoose.model('Type', TypeSchema)
// Collection name 'Type' will change to 'types'
