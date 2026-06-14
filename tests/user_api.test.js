const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const User = require('../models/user')
const bcrypt = require('bcryptjs')

const api = supertest(app)

let adminToken
let userToken

beforeEach(async () => {
  await User.deleteMany({})

  const adminPw = await bcrypt.hash('admin123', 10)
  const admin = new User({
    username: 'testadmin',
    name: 'Test Admin',
    passwordHash: adminPw,
    role: 'admin'
  })
  await admin.save()

  const userPw = await bcrypt.hash('user123', 10)
  const normal = new User({
    username: 'testuser',
    name: 'Test User',
    passwordHash: userPw,
    role: 'user'
  })
  await normal.save()

  const second = new User({
    username: 'anotheruser',
    name: 'Another User',
    passwordHash: userPw,
    role: 'user'
  })
  await second.save()

  const adminLogin = await api
    .post('/api/login')
    .send({ username: 'testadmin', password: 'admin123' })
  adminToken = adminLogin.body.token

  const userLogin = await api
    .post('/api/login')
    .send({ username: 'testuser', password: 'user123' })
  userToken = userLogin.body.token
})

test('users endpoint returns 401 without token', async () => {
  await api.get('/api/users').expect(401)
})

test('users endpoint returns 403 for non-admin', async () => {
  await api
    .get('/api/users')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(403)
})

test('users endpoint returns paginated list for admin', async () => {
  const res = await api
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  assert.strictEqual(res.body.total, 3)
  assert.strictEqual(res.body.page, 1)
  assert.strictEqual(res.body.pages, 1)
  assert.strictEqual(res.body.data.length, 3)
})

test('users endpoint supports search', async () => {
  const res = await api
    .get('/api/users?search=another')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  assert.strictEqual(res.body.total, 1)
  assert.strictEqual(res.body.data[0].username, 'anotheruser')
})

test('users endpoint supports pagination', async () => {
  const res = await api
    .get('/api/users?limit=2')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  assert.strictEqual(res.body.data.length, 2)
  assert.strictEqual(res.body.pages, 2)
})

test('admin can get a single user by id', async () => {
  const listRes = await api
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)

  const userId = listRes.body.data[0].id

  const res = await api
    .get(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  assert.strictEqual(res.body.id, userId)
})

test('admin can update user role', async () => {
  const listRes = await api
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)

  const userId = listRes.body.data.find(u => u.username === 'testuser').id

  const res = await api
    .put(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'admin' })
    .expect(200)

  assert.strictEqual(res.body.role, 'admin')
})

test('non-admin cannot update user role', async () => {
  const listRes = await api
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)

  const userId = listRes.body.data[0].id

  await api
    .put(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ role: 'admin' })
    .expect(403)
})

test('registration prevents admin role', async () => {
  const res = await api
    .post('/api/users')
    .send({ username: 'newguy', password: 'pass123', name: 'New Guy', role: 'admin' })
    .expect(201)

  assert.strictEqual(res.body.role, 'user')
})

after(async () => {
  await mongoose.connection.close()
})
