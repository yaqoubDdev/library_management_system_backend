const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema({
  title: {
    required: true,
    type: String
  },
  author: String,
  category: String,
  description: String,
  copies: Number,
  isbn: String
})

bookSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject.__v
    delete returnedObject._id
  }
})

module.exports = mongoose.model('Book', bookSchema)