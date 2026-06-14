const borrowsRouter = require('express').Router()
const BorrowRecord = require('../models/borrowRecord')
const middleware = require('../utils/middleware')

// ─── ADMIN: Get all borrow records with optional search ───────────────────────
borrowsRouter.get('/', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  const { search, status } = req.query

  BorrowRecord.find({})
    .populate('book', 'title author isbn')
    .populate('user', 'username name')
    .sort({ borrowedAt: -1 })
    .then((records) => {
      let filtered = records

      // Filter by status if provided
      if (status && ['borrowed', 'returned'].includes(status)) {
        filtered = filtered.filter((r) => r.status === status)
      }

      // Search by username, name, book title, or isbn
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter((r) => {
          const username = r.user?.username?.toLowerCase() || ''
          const name = r.user?.name?.toLowerCase() || ''
          const title = r.book?.title?.toLowerCase() || ''
          const isbn = r.book?.isbn?.toLowerCase() || ''
          return (
            username.includes(q) ||
            name.includes(q) ||
            title.includes(q) ||
            isbn.includes(q)
          )
        })
      }

      res.json(filtered)
    })
    .catch((error) => next(error))
})

// ─── USER: Get own borrow records ─────────────────────────────────────────────
borrowsRouter.get('/my', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })

  const { status } = req.query

  const query = { user: user._id }
  if (status && ['borrowed', 'returned'].includes(status)) {
    query.status = status
  }

  BorrowRecord.find(query)
    .populate('book', 'title author isbn category copies')
    .sort({ borrowedAt: -1 })
    .then((records) => {
      res.json(records)
    })
    .catch((error) => next(error))
})

// ─── USER: Request extension on a borrow record ───────────────────────────────
borrowsRouter.post('/:id/request-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      if (record.user.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'not your borrow record' })
      }
      if (record.status === 'returned') {
        return res.status(400).json({ error: 'book already returned' })
      }
      if (record.extensionRequested) {
        return res.status(400).json({ error: 'extension already requested' })
      }

      // Must request before due date
      const now = new Date()
      if (now > record.dueDate) {
        return res.status(400).json({ error: 'due date has passed, extension cannot be requested' })
      }

      record.extensionRequested = true
      record.save()
        .then((saved) => res.json({ message: 'extension request submitted', record: saved }))
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Approve extension request ─────────────────────────────────────────
borrowsRouter.post('/:id/approve-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  const { days } = req.body
  const extensionDays = parseInt(days) || 7

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      if (!record.extensionRequested) {
        return res.status(400).json({ error: 'no extension was requested' })
      }
      if (record.extensionApproved) {
        return res.status(400).json({ error: 'extension already approved' })
      }
      if (record.status === 'returned') {
        return res.status(400).json({ error: 'book already returned' })
      }

      // Extend the due date
      const newDueDate = new Date(record.dueDate)
      newDueDate.setDate(newDueDate.getDate() + extensionDays)

      record.dueDate = newDueDate
      record.extensionApproved = true
      record.extensionDays = extensionDays

      record.save()
        .then((saved) =>
          res.json({
            message: `Due date extended by ${extensionDays} days`,
            record: saved
          })
        )
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

// ─── ADMIN: Deny extension request ────────────────────────────────────────────
borrowsRouter.post('/:id/deny-extension', middleware.userExtractor, (req, res, next) => {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'token missing or invalid' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'admin access only' })

  BorrowRecord.findById(req.params.id)
    .then((record) => {
      if (!record) return res.status(404).json({ error: 'borrow record not found' })
      record.extensionRequested = false
      record.save()
        .then((saved) => res.json({ message: 'extension request denied', record: saved }))
        .catch((error) => next(error))
    })
    .catch((error) => next(error))
})

module.exports = borrowsRouter
