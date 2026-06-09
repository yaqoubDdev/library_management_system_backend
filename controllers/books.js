const booksRouter = require('express').Router()
const Book = require('../models/book')

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

booksRouter.post('/', (req, res, next) => {
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

booksRouter.delete('/:id', (req, res, next) => {
  Book.findByIdAndDelete(req.params.id)
    .then((result) => {
      res.json({ message: `deleted ${req.params.id}` }).status(204)
    })
    .catch((error) => next(error))
})

booksRouter.put('/:id', (req, res, next) => {
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

module.exports = booksRouter