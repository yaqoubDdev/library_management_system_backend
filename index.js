const express = require('express')
const cors = require('cors')
const Book = require('./models/book')

const app = express()
app.use(express.json())
app.use(cors())

let books = [
  {
    _id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    category: 'Classic',
    description:
      'A novel about wealth, love, and the American Dream in the 1920s.',
    copies: 5,
  },
  {
    _id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    category: 'Fiction',
    description:
      'A story of racial injustice and moral growth in the American South.',
    copies: 8,
  },
  {
    _id: '3',
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    category: 'Dystopian',
    description:
      'A chilling depiction of a totalitarian society under constant surveillance.',
    copies: 12,
  },
  {
    _id: '4',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    isbn: '9780547928227',
    category: 'Fantasy',
    description:
      'Bilbo Baggins embarks on an unexpected journey to reclaim a lost kingdom.',
    copies: 7,
  },
  {
    _id: '5',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    category: 'Technology',
    description:
      'A guide to writing maintainable, readable, and efficient code.',
    copies: 6,
  },
]

const requestLogger = (request, response, next) => {
  console.log('')
  console.log('---')
  console.log('Method:', request.method)
  console.log('Path:  ', request.path)
  console.log('Body:  ', request.body)
  console.log('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}


app.use(requestLogger)

app.get('/info', (req, res) => {
  res.send(`<p>Library has info for ${books.length} books</p><p>${new Date()}</p>`)
})

app.get('/api/books', (req, res) => {
  Book.find({}).then(books => {
    res.json(books)
  })
})

app.get('/api/books/:id', (req, res) => {
  Book.findById(req.params.id).then(book => {
    res.json(book)
  })
})

app.post('/api/books', (req, res) => {
  console.log(req.body)
  let body = req.body
  if (!body) {
    return res.status(400).json({ error: 'missing body' })
  }

  const book = new Book({
    ...body
  })

  book.save().then(savedBook => {
    res.json(savedBook)
  })
})

app.delete('/api/books/:id', (req, res) => {
  Book.findByIdAndDelete(req.params.id).then(result => {
    res.json({message: `deleted ${req.params.id}`}).status(204)
  })
})

app.put('/api/books/:id', (req, res) => {
  const id = req.params.id
  const updatedBook = req.body
  books = books.map((book) => (book._id === id ? updatedBook : book))
  res.json(updatedBook)
})

app.use(unknownEndpoint)


const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log('server running on port ' + PORT)
})
