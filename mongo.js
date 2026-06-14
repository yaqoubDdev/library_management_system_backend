require('dotenv').config()
const mongoose = require('mongoose')
const Book = require('./models/book')

const URI = process.env.TEST_MONGODB_URI

mongoose.set('strictQuery', false)
mongoose.connect(URI, {family: 4})
  .then(result => {
    console.log('connected to MongoDB')
  })
  .catch(error => {
    console.error('error connecting to MongoDB:', error.message)
  })

const books = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "9780743273565",
    category: "Classic",
    description: "A novel about wealth, love, and the American Dream in the 1920s.",
    copies: 5
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "9780061120084",
    category: "Fiction",
    description: "A story of racial injustice and moral growth in the American South.",
    copies: 8
  },
  {
    title: "1984",
    author: "George Orwell",
    isbn: "9780451524935",
    category: "Dystopian",
    description: "A chilling depiction of a totalitarian society under constant surveillance.",
    copies: 12
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    isbn: "9780547928227",
    category: "Fantasy",
    description: "Bilbo Baggins embarks on an unexpected journey to reclaim a lost kingdom.",
    copies: 7
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    category: "Technology",
    description: "A guide to writing maintainable, readable, and efficient code.",
    copies: 6
  }
]

const book = new Book({
  ...books[0]
})

book.save().then(result => {
  console.log('book saved!')
})

Book.find({}).then(books => {
  books.forEach(book => {
    console.log(book)
  })
  mongoose.connection.close()
}).catch(error => {
  console.error('error geting books:', error.message)
})

