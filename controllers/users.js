const usersRouter = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/user')
const BorrowRecord = require('../models/borrowRecord')
const middleware = require('../utils/middleware')

// ─── PUBLIC: Register a new user ─────────────────────────────────────────────
usersRouter.post('/', (req, res, next) => {
  const { username, name, password, role } = req.body

  if (!password || password.length < 3) {
    return res.status(400).json({
      error: 'password must be at least 3 characters long'
    })
  }

  if (!username || username.length < 3) {
    return res.status(400).json({
      error: 'username must be at least 3 characters long'
    })
  }

  User.findOne({ username })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(400).json({
          error: 'username must be unique'
        })
      }

      // Only allow admin role if no users exist yet (first-time bootstrap)
      // Otherwise force regular user role on registration
      User.countDocuments({})
        .then((count) => {
          const effectiveRole = count === 0 ? (role || 'admin') : 'user'

          const saltRounds = 10
          bcrypt.hash(password, saltRounds)
            .then((passwordHash) => {
              const user = new User({
                username,
                name,
                passwordHash,
                role: effectiveRole
              })

              user.save()
                .then((savedUser) => {
                  res.status(201).json(savedUser)
                })
                .catch((error) => next(error))
            })
            .catch((error) => next(error))
        })
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Get all users (with pagination & search) ──────────────────────────
usersRouter.get('/', middleware.userExtractor, async (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  try {
    const { search, page, limit } = req.query
    const pageNum = Math.max(parseInt(page) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const skip = (pageNum - 1) * limitNum

    const filter = {}
    if (search) {
      const regex = new RegExp(search, 'i')
      filter.$or = [{ username: regex }, { name: regex }]
    }

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limitNum),
      User.countDocuments(filter)
    ])

    res.json({ data: users, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    next(error)
  }
})

// ─── ADMIN: Get a single user ─────────────────────────────────────────────────
usersRouter.get('/:id', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  User.findById(req.params.id)
    .then((found) => {
      if (!found) return res.status(404).json({ error: 'user not found' })
      res.json(found)
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Update user (name, role) ──────────────────────────────────────────
usersRouter.put('/:id', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  const { name, role } = req.body

  User.findByIdAndUpdate(
    req.params.id,
    { name, role },
    { returnDocument: 'after', runValidators: true, context: 'query' }
  )
    .then((updated) => {
      if (!updated) return res.status(404).json({ error: 'user not found' })
      res.json(updated)
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Delete a user ─────────────────────────────────────────────────────
usersRouter.delete('/:id', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })
  if (user._id.toString() === req.params.id) {
    return res.status(400).json({ error: 'cannot delete yourself' })
  }

  // Check for active borrows
  BorrowRecord.findOne({ user: req.params.id, status: 'borrowed' })
    .then((active) => {
      if (active) {
        return res.status(400).json({ error: 'user has active borrows, return books first' })
      }

      User.findByIdAndDelete(req.params.id)
        .then((deleted) => {
          if (!deleted) return res.status(404).json({ error: 'user not found' })
          res.status(204).end()
        })
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

module.exports = usersRouter
