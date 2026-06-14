const express = require('express')
const cors = require('cors')
const logger = require('./utils/logger')
const config = require('./utils/config')
const middleware = require('./utils/middleware')
const mongoose = require('mongoose')
const booksRouter = require('./controllers/books')
const Book = require('./models/book')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const borrowsRouter = require('./controllers/borrows')

const app = express()
app.use(cors())

app.use(express.static('public'))

logger.info('Connecting to:', config.MONGODB_URI)

mongoose
  .connect(config.MONGODB_URI, { family: 4 })
  .then((result) => {
    logger.info('connected to MongoDB')
  })
  .catch((error) => {
    logger.error('error connecting to MongoDB:', error.message)
  })

app.use(express.json())
app.use(middleware.tokenExtractor)
app.use(middleware.requestLogger)

app.get('/info', (req, res, next) => {
  Book.countDocuments({})
    .then((count) => {
      res.send(
        `<p>Library has info for ${count} books</p><p>${new Date()}</p>`,
      )
    })
    .catch((error) => next(error))
})

app.use('/api/books', booksRouter)
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/borrows', borrowsRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app
