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
  },
  {
    title: 'JavaScript fundamentals',
    author: 'John Doe',
    isbn: '5555555555',
    category: 'Programming',
    description: 'Learn JS',
    copies: 7
  }
]

beforeEach(async () => {
  await Book.deleteMany({})
  await User.deleteMany({})

  const adminPasswordHash = await bcrypt.hash('secret', 10)
  const adminUser = new User({
    username: 'admin',
    name: 'Admin User',
    passwordHash: adminPasswordHash,
    role: 'admin'
  })
  await adminUser.save()

  const userPasswordHash = await bcrypt.hash('secret', 10)
  const normalUser = new User({
    username: 'user',
    name: 'Normal User',
    passwordHash: userPasswordHash,
    role: 'user'
  })
  await normalUser.save()

  const adminLoginResponse = await api
    .post('/api/login')
    .send({ username: 'admin', password: 'secret' })
  token = adminLoginResponse.body.token

  const userLoginResponse = await api
    .post('/api/login')
    .send({ username: 'user', password: 'secret' })
  nonAdminToken = userLoginResponse.body.token

  for (const book of initialBooks) {
    const bookObject = new Book(book)
    await bookObject.save()
  }
})

test('books are returned as json', async () => {
  const res = await api
    .get('/api/books')
    .expect(200)
    .expect('Content-Type', /application\/json/)
  assert.ok(Array.isArray(res.body.data))
})

test('all books are returned with pagination metadata', async () => {
  const response = await api.get('/api/books')
  assert.strictEqual(response.body.total, initialBooks.length)
  assert.strictEqual(response.body.page, 1)
  assert.strictEqual(response.body.pages, 1)
  assert.strictEqual(response.body.data.length, initialBooks.length)
})

test('a specific book is within the returned books', async () => {
  const response = await api.get('/api/books')
  const titles = response.body.data.map(r => r.title)
  assert(titles.includes('HTML is easy'))
})

test('paginates with limit parameter', async () => {
  const response = await api.get('/api/books?limit=2')
  assert.strictEqual(response.body.total, initialBooks.length)
  assert.strictEqual(response.body.data.length, 2)
  assert.strictEqual(response.body.page, 1)
  assert.strictEqual(response.body.pages, 2)
})

test('paginates with page parameter', async () => {
  const response = await api.get('/api/books?limit=2&page=2')
  assert.strictEqual(response.body.total, initialBooks.length)
  assert.strictEqual(response.body.data.length, 1)
  assert.strictEqual(response.body.page, 2)
  assert.strictEqual(response.body.pages, 2)
})

test('search by title', async () => {
  const response = await api.get('/api/books?search=HTML')
  assert.strictEqual(response.body.total, 1)
  assert.strictEqual(response.body.data[0].title, 'HTML is easy')
})

test('search by author', async () => {
  const response = await api.get('/api/books?search=Jane')
  assert.strictEqual(response.body.total, 1)
  assert.strictEqual(response.body.data[0].author, 'Jane Doe')
})

test('filter by category', async () => {
  const response = await api.get('/api/books?category=Programming')
  assert.strictEqual(response.body.total, 1)
  assert.strictEqual(response.body.data[0].category, 'Programming')
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
  const titles = response.body.data.map(r => r.title)

  assert.strictEqual(response.body.total, initialBooks.length + 1)
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
  assert.strictEqual(response.body.total, initialBooks.length)
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

after(async () => {
  await mongoose.connection.close()
})
