const usersRouter = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/user')

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

  // Check if username is already taken
  User.findOne({ username })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(400).json({
          error: 'username must be unique'
        })
      }

      const saltRounds = 10
      bcrypt.hash(password, saltRounds)
        .then((passwordHash) => {
          const user = new User({
            username,
            name,
            passwordHash,
            role: role || 'user'
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

usersRouter.get('/', (req, res, next) => {
  User.find({})
    .then((users) => {
      res.json(users)
    })
    .catch((error) => next(error))
})

module.exports = usersRouter
