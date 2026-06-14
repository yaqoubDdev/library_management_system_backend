const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Book = require('../models/book')
const User = require('../models/user')
const bcrypt = require('bcryptjs')

const api = supertest(app)

let token
let nonAdminToken

const initialBooks = [
  {
    title: 'HTML is easy',
    author: 'John Doe',
    isbn: '1234567890',
    category: 'Tech',
    description: 'A book about HTML',
    copies: 5
  },
  {
    title: 'CSS is hard',
    author: 'Jane Doe',
    isbn: '0987654321',
    category: 'Tech',
    description: 'A book about CSS',
    copies: 3
  }
]

beforeEach(async () => {
  await Book.deleteMany({})
  await User.deleteMany({})

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('secret', 10)
  const adminUser = new User({
    username: 'admin',
    name: 'Admin User',
    passwordHash: adminPasswordHash,
    role: 'admin'
  })
  await adminUser.save()

  // Create normal user
  const userPasswordHash = await bcrypt.hash('secret', 10)
  const normalUser = new User({
    username: 'user',
    name: 'Normal User',
    passwordHash: userPasswordHash,
    role: 'user'
  })
  await normalUser.save()

  // Login admin to get token
  const adminLoginResponse = await api
    .post('/api/login')
    .send({ username: 'admin', password: 'secret' })
  token = adminLoginResponse.body.token

  // Login normal user to get token
  const userLoginResponse = await api
    .post('/api/login')
    .send({ username: 'user', password: 'secret' })
  nonAdminToken = userLoginResponse.body.token

  // Seed books
  let bookObject = new Book(initialBooks[0])
  await bookObject.save()
  bookObject = new Book(initialBooks[1])
  await bookObject.save()
})

test('books are returned as json', async () => {
  await api
    .get('/api/books')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all books are returned', async () => {
  const response = await api.get('/api/books')
  assert.strictEqual(response.body.length, initialBooks.length)
})

test('a specific book is within the returned books', async () => {
  const response = await api.get('/api/books')
  const titles = response.body.map(r => r.title)
  assert(titles.includes('HTML is easy'))
})

test('a valid book can be added by an admin', async () => {
  const newBook = {
    title: 'Async/Await is awesome',
    author: 'JS Dev',
    isbn: '1122334455',
    category: 'Tech',
    description: 'A book about async/await',
    copies: 10
  }

  await api
    .post('/api/books')
    .set('Authorization', `Bearer ${token}`)
    .send(newBook)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  const response = await api.get('/api/books')
  const titles = response.body.map(r => r.title)

  assert.strictEqual(response.body.length, initialBooks.length + 1)
  assert(titles.includes('Async/Await is awesome'))
})

test('book without title is not added by admin', async () => {
  const newBook = {
    author: 'No Title Author',
    copies: 1
  }

  await api
    .post('/api/books')
    .set('Authorization', `Bearer ${token}`)
    .send(newBook)
    .expect(400)

  const response = await api.get('/api/books')
  assert.strictEqual(response.body.length, initialBooks.length)
})

test('adding book fails with 401 if token is not provided', async () => {
  const newBook = {
    title: 'No Token Book',
    author: 'Anonymous',
    copies: 1
  }

  await api
    .post('/api/books')
    .send(newBook)
    .expect(401)
})

test('adding book fails with 403 if user is not admin', async () => {
  const newBook = {
    title: 'No Admin Book',
    author: 'User',
    copies: 1
  }

  await api
    .post('/api/books')
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .send(newBook)
    .expect(403)
})

test('an authenticated user can borrow a book successfully', async () => {
  const booksResponse = await api.get('/api/books')
  const book = booksResponse.body[0]
  const initialCopies = book.copies

  const borrowResponse = await api
    .post(`/api/books/${book.id}/borrow`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  assert.strictEqual(borrowResponse.body.book.copies, initialCopies - 1)
  assert.strictEqual(borrowResponse.body.message, 'book borrowed successfully')

  // Check borrow status
  const statusResponse = await api
    .get(`/api/books/${book.id}/borrow-status`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  assert.strictEqual(statusResponse.body.borrowed, true)
})

test('user cannot borrow the same book twice simultaneously', async () => {
  const booksResponse = await api.get('/api/books')
  const book = booksResponse.body[0]

  // First borrow
  await api
    .post(`/api/books/${book.id}/borrow`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  // Second borrow should fail
  await api
    .post(`/api/books/${book.id}/borrow`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(400)
})

test('user can return a borrowed book successfully', async () => {
  const booksResponse = await api.get('/api/books')
  const book = booksResponse.body[0]
  const initialCopies = book.copies

  // Borrow
  await api
    .post(`/api/books/${book.id}/borrow`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  // Return
  const returnResponse = await api
    .post(`/api/books/${book.id}/return`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  assert.strictEqual(returnResponse.body.book.copies, initialCopies)
  assert.strictEqual(returnResponse.body.message, 'book returned successfully')

  // Check status
  const statusResponse = await api
    .get(`/api/books/${book.id}/borrow-status`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(200)

  assert.strictEqual(statusResponse.body.borrowed, false)
})

test('user cannot return a book they have not borrowed', async () => {
  const booksResponse = await api.get('/api/books')
  const book = booksResponse.body[0]

  await api
    .post(`/api/books/${book.id}/return`)
    .set('Authorization', `Bearer ${nonAdminToken}`)
    .expect(400)
})

after(async () => {
  await mongoose.connection.close()
})

