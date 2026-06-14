const booksRouter = require('express').Router()
const Book = require('../models/book')
const middleware = require('../utils/middleware')

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

module.exports = booksRouter