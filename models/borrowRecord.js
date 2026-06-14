const mongoose = require('mongoose')

const borrowRecordSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  returnedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned'],
    default: 'borrowed',
    required: true
  }
})

borrowRecordSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema)
