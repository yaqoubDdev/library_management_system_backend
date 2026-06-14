const booksRouter = require('express').Router()
const Book = require('../models/book')
const middleware = require('../utils/middleware')
const BorrowRecord = require('../models/borrowRecord')

booksRouter.get('/', (req, res) => {
  Book.find({}).then((books) => {
    res.json(books)
  })
})

booksRouter.get('/:id', (req, res, next) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (book) {
        res.json(book)
      } else {
        res.status(404).end()
      }
    })
    .catch((error) => next(error))
})

booksRouter.post('/', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'only admins can add books' })
  }

  console.log(req.body)
  let body = req.body
  if (!body) {
    return res.status(400).json({ error: 'missing body' })
  }

  const book = new Book({
    ...body,
  })

  book
    .save()
    .then((savedBook) => {
      res.json(savedBook)
    })
    .catch((error) => next(error))
})

booksRouter.delete('/:id', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'only admins can delete books' })
  }

  Book.findByIdAndDelete(req.params.id)
    .then((result) => {
      res.status(204).end()
    })
    .catch((error) => next(error))
})

booksRouter.put('/:id', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'only admins can edit books' })
  }

  const id = req.params.id
  const body = req.body

  Book.findByIdAndUpdate(id, body, {
    returnDocument: 'after',
    runValidators: true,
    context: 'query',
  })
    .then((updatedBook) => {
      if (!updatedBook) {
        return res.status(404).end()
      }

      res.json(updatedBook)
    })
    .catch((error) => next(error))
})

// Borrow a book
booksRouter.post('/:id/borrow', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }

  const bookId = req.params.id

  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: 'book not found' })
      }

      if (book.copies < 1) {
        return res.status(400).json({ error: 'no copies available for borrowing' })
      }

      // Check if user has already borrowed this book
      BorrowRecord.findOne({ book: bookId, user: user._id, status: 'borrowed' })
        .then((existingRecord) => {
          if (existingRecord) {
            return res.status(400).json({ error: 'you have already borrowed this book' })
          }

          const record = new BorrowRecord({
            book: bookId,
            user: user._id
          })

          record.save()
            .then(() => {
              book.copies -= 1
              book.save()
                .then((savedBook) => {
                  res.json({ message: 'book borrowed successfully', book: savedBook })
                })
                .catch((error) => next(error))
            })
            .catch((error) => next(error))
        })
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// Return a book
booksRouter.post('/:id/return', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'token missing or invalid' })
  }

  const bookId = req.params.id

  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: 'book not found' })
      }

      BorrowRecord.findOne({ book: bookId, user: user._id, status: 'borrowed' })
        .then((record) => {
          if (!record) {
            return res.status(400).json({ error: 'you have not borrowed this book' })
          }

          record.status = 'returned'
          record.returnedAt = new Date()

          record.save()
            .then(() => {
              book.copies += 1
              book.save()
                .then((savedBook) => {
                  res.json({ message: 'book returned successfully', book: savedBook })
                })
                .catch((error) => next(error))
            })
            .catch((error) => next(error))
        })
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// Check borrow status
booksRouter.get('/:id/borrow-status', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.json({ borrowed: false })
  }

  BorrowRecord.findOne({ book: req.params.id, user: user._id, status: 'borrowed' })
    .then((record) => {
      res.json({ borrowed: !!record })
    })
    .catch((error) => next(error))
})

module.exports = booksRouter