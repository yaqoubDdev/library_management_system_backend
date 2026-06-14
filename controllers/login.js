const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')

loginRouter.post('/', (req, res, next) => {
  const { username, password } = req.body

  User.findOne({ username })
    .then((user) => {
      if (!user) {
        return res.status(401).json({
          error: 'invalid username or password'
        })
      }

      bcrypt.compare(password, user.passwordHash)
        .then((passwordCorrect) => {
          if (!passwordCorrect) {
            return res.status(401).json({
              error: 'invalid username or password'
            })
          }

          const userForToken = {
            username: user.username,
            id: user._id,
            role: user.role
          }

          // Generate token using the SECRET from config. If not specified, default to a fallback
          const token = jwt.sign(
            userForToken, 
            config.SECRET || 'development_secret_fallback',
            { expiresIn: 60*60*24 } // 24 hours expiry
          )

          res.status(200).send({
            token,
            username: user.username,
            name: user.name,
            role: user.role
          })
        })
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

module.exports = loginRouter
