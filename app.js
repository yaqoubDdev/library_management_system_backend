const express = require('express')
const cors = require('cors')
const logger = require('./utils/logger')
const config = require('./utils/config')
const middleware = require('./utils/middleware')
const mongoose = require('mongoose')
const booksRouter = require('./controllers/books')

const app = express()

logger.info('Connecting to:', config.MONGODB_URI)

mongoose
    .connect(config.MONGODB_URI, {family: 4})
    .then(result => {
        logger.info('connected to MongoDB')
    })
    .catch(error => {
        logger.error('error connecting to MongoDB:', error.message)
    })

app.use(express.json())
app.use(cors())
app.use(middleware.requestLogger)

app.get('/info', (req, res) => {
  res.send(
    `<p>Library has info for ${books.length} books</p><p>${new Date()}</p>`,
  )
})

app.use('/api/books', booksRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app