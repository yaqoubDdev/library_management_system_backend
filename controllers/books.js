const booksRouter = require('express').Router()
const Book = require('../models/book')
const middleware = require('../utils/middleware')

booksRouter.get('/', async (req, res, next) => {
  try {
    const { search, category, page, limit } = req.query
    const pageNum = Math.max(parseInt(page) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    const filter = {}
    if (search) {
      const regex = new RegExp(search, 'i')
      filter.$or = [{ title: regex }, { author: regex }]
    }
    if (category) {
      filter.category = category
    }

    const [books, total] = await Promise.all([
      Book.find(filter).skip(skip).limit(limitNum),
      Book.countDocuments(filter)
    ])

    res.json({
      data: books,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    })
  } catch (error) {
    next(error)
  }
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